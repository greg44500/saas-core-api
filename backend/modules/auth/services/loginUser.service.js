import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';
import { AppError } from '../../../utils/appError.js';
import {
    canonicalizeEmail,
} from '../../../utils/canonicalizeEmail.js';
import {
    verifyPassword,
} from '../../../utils/password.js';
import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';
import {
    AuthIdentity,
} from '../../authIdentities/authIdentity.model.js';
import {
    createInitialAuthSession,
} from '../../authSessions/authSession.service.js';
import { User } from '../../users/user.model.js';

const INVALID_CREDENTIALS_MESSAGE =
    'Identifiants invalides';

/*
 * Motifs techniques associés aux refus de connexion.
 *
 * Ces valeurs ne sont jamais retournées au client. Elles permettent
 * uniquement d'exploiter les AuditLog sans y enregistrer l'email,
 * le mot de passe fourni ou une information d'authentification brute.
 */
const LOGIN_FAILURE_REASON = Object.freeze({
    INVALID_CREDENTIALS: 'invalid_credentials',
    ACCOUNT_DISABLED: 'account_disabled',
    ACCOUNT_DELETION_REQUESTED: 'account_deletion_requested',
    ACCOUNT_CLOSED: 'account_closed',
});

/**
 * Tente d'enregistrer le résultat d'une connexion.
 *
 * Le login ne participe actuellement pas à une transaction MongoDB unique :
 * l'AuthSession et lastLoginAt sont persistés avant l'AuditLog. Une panne de
 * l'audit ne doit donc pas transformer une connexion déjà créée en échec HTTP.
 *
 * L'erreur reste signalée côté serveur avec un contexte strictement limité.
 * Aucun email, mot de passe, token ou contenu de metadata n'est journalisé.
 *
 * @param {object} auditData
 * @returns {Promise<void>}
 */
const writeLoginAuditLog = async (auditData) => {
    try {
        await createAuditLog(auditData);
    } catch (error) {
        /*
         * Ce traitement est temporaire et devra rejoindre le futur
         * système centralisé de logs et de monitoring.
         */
        console.error(
            'Authentication audit log creation failed',
            {
                action: auditData.action,
                errorName: error?.name,
            },
        );
    }
};

/**
 * Audite puis refuse une tentative de connexion.
 *
 * actor reste volontairement null : tant que le login n'est pas réussi,
 * l'identité réelle de la personne à l'origine de la requête n'est pas
 * établie. Attribuer l'action au compte ciblé fausserait l'historique
 * lorsqu'un tiers tente d'utiliser ses identifiants.
 *
 * Lorsque le compte est connu, il est uniquement référencé comme
 * ressource visée par la tentative.
 *
 * @param {object} input
 * @param {import('mongoose').Types.ObjectId|string|null}
 *   [input.targetUserId]
 * @param {string} input.reasonCode
 * @param {string} [input.publicMessage]
 * @param {number} [input.statusCode]
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<never>}
 */
const rejectLoginAttempt = async ({
    targetUserId = null,
    reasonCode,
    publicMessage = INVALID_CREDENTIALS_MESSAGE,
    statusCode = 401,
    ipAddress = null,
    userAgent = null,
}) => {
    await writeLoginAuditLog({
        actor: null,
        action: AUDIT_ACTION.LOGIN_FAILED,
        entityType: targetUserId
            ? AUDIT_ENTITY_TYPE.USER
            : null,
        entityId: targetUserId,
        status: AUDIT_STATUS.FAILED,
        ipAddress,
        userAgent,
        metadata: {
            provider: AUTH_PROVIDER.LOCAL,
            reasonCode,
        },
    });

    throw new AppError(publicMessage, statusCode);
};

/**
 * Authentifie un utilisateur avec son identité locale.
 *
 * Le même message d'erreur est utilisé lorsque l'email, l'identité
 * locale ou le mot de passe est incorrect afin de ne pas révéler
 * inutilement l'existence d'un compte.
 *
 * Une fois l'authentification validée, une nouvelle AuthSession est créée.
 * Le refresh token brut est retourné uniquement afin que le controller
 * puisse ensuite le placer dans un cookie HttpOnly.
 *
 * Chaque résultat est transmis au domaine AuditLog. L'audit d'un échec
 * ne contient jamais l'email ou le mot de passe fourni.
 */
const loginUser = async ({
    email,
    password,
    ipAddress = null,
    userAgent = null,
}) => {
    const emailCanonical = canonicalizeEmail(email);

    const user = await User.findOne({
        emailCanonical,
    });

    if (!user) {
        return rejectLoginAttempt({
            reasonCode:
                LOGIN_FAILURE_REASON.INVALID_CREDENTIALS,
            ipAddress,
            userAgent,
        });
    }

    const authIdentity = await AuthIdentity.findOne({
        user: user._id,
        provider: AUTH_PROVIDER.LOCAL,
    }).select('+passwordHash');

    if (!authIdentity) {
        return rejectLoginAttempt({
            targetUserId: user._id,
            reasonCode:
                LOGIN_FAILURE_REASON.INVALID_CREDENTIALS,
            ipAddress,
            userAgent,
        });
    }

    const passwordIsValid = await verifyPassword(
        password,
        authIdentity.passwordHash,
    );

    if (!passwordIsValid) {
        return rejectLoginAttempt({
            targetUserId: user._id,
            reasonCode:
                LOGIN_FAILURE_REASON.INVALID_CREDENTIALS,
            ipAddress,
            userAgent,
        });
    }

    if (user.status === USER_STATUS.DISABLED) {
        return rejectLoginAttempt({
            targetUserId: user._id,
            reasonCode:
                LOGIN_FAILURE_REASON.ACCOUNT_DISABLED,
            publicMessage: 'Compte désactivé',
            statusCode: 403,
            ipAddress,
            userAgent,
        });
    }

    if (user.status === USER_STATUS.DELETION_REQUESTED) {
        return rejectLoginAttempt({
            targetUserId: user._id,
            reasonCode:
                LOGIN_FAILURE_REASON.ACCOUNT_DELETION_REQUESTED,
            publicMessage: 'Fermeture du compte en cours',
            statusCode: 403,
            ipAddress,
            userAgent,
        });
    }

    if (user.status === USER_STATUS.CLOSED) {
        return rejectLoginAttempt({
            targetUserId: user._id,
            reasonCode:
                LOGIN_FAILURE_REASON.ACCOUNT_CLOSED,
            publicMessage: 'Compte clôturé',
            statusCode: 403,
            ipAddress,
            userAgent,
        });
    }

    const {
        authSession,
        refreshToken,
    } = await createInitialAuthSession({
        userId: user._id,
        ipAddress,
        userAgent,
    });

    user.lastLoginAt = new Date();

    await user.save();

    await writeLoginAuditLog({
        actor: user._id,
        action: AUDIT_ACTION.LOGIN_SUCCESS,
        entityType:
            AUDIT_ENTITY_TYPE.AUTH_SESSION,
        entityId: authSession._id,
        status: AUDIT_STATUS.SUCCESS,
        ipAddress,
        userAgent,
        metadata: {
            provider: AUTH_PROVIDER.LOCAL,
        },
    });

    return {
        user,
        refreshToken,
    };
};

export {
    loginUser,
};
