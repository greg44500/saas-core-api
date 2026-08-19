import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { performance } from 'node:perf_hooks';
import { sendEmail } from '../../services/email.service.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    changeUserPassword,
} from './services/changeUserPassword.service.js';
import {
    resetUserPassword,
} from './services/resetUserPassword.service.js';
import {
    createAuditLog,
} from '../auditLog/auditLog.service.js';
import {
    ensureMinimumDuration,
} from '../../utils/securityTiming.js';
import {
    createPasswordResetToken,
} from '../passwordResetTokens/passwordResetToken.service.js';

import {
    buildPasswordResetEmail,
} from '../../services/emailTemplates/passwordResetEmail.js';

import {
    buildPasswordResetUrl,
} from './passwordResetUrl.js';
import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AppError } from '../../utils/AppError.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { AuthIdentity } from '../authIdentities/authIdentity.model.js';
import { User } from '../users/user.model.js';
import { createInitialAuthSession } from '../authSessions/authSession.service.js';


import {
    USER_STATUS,
} from '../../constants/userStatus.constants.js';

/*
 * Messages internes du module Auth.
 */
const EMAIL_ALREADY_USED_MESSAGE =
    'Un compte existe déjà avec cette adresse email';

const INVALID_CREDENTIALS_MESSAGE = 'Identifiants invalides';

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
    ACCOUNT_CLOSED: 'account_closed',
});

const FORGOT_PASSWORD_RESPONSE_MESSAGE =
    'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.';

/*
* Compensation temporelle du workflow forgot-password.
*
* Le but n'est PAS d'obtenir un temps d'exécution cryptographiquement
* constant, mais de réduire l'écart observable entre :
* - une adresse inconnue qui quitte rapidement le workflow ;
* - un compte valide qui réalise plusieurs accès DB puis un envoi SMTP.
*
* Ces valeurs devront être réévaluées lorsque les emails seront
* délégués à une file de tâches durable.
*/
const FORGOT_PASSWORD_MINIMUM_DURATION_MS = 700;
const FORGOT_PASSWORD_JITTER_MS = 150;

/**
 * Crée un compte utilisateur utilisant l'authentification locale.
 *
 * User et AuthIdentity sont créés dans une même transaction afin
 * d'éviter qu'un compte partiellement initialisé reste en base.
 *
 * @param {object} input Données préalablement validées par registerSchema.
 * @param {string} input.firstName
 * @param {string} input.lastName
 * @param {string} input.email
 * @param {string} input.password
 * @returns {Promise<import('mongoose').Document>} User nouvellement créé.
 */
const registerUser = async ({
    firstName,
    lastName,
    email,
    password,
}) => {
    const emailCanonical = canonicalizeEmail(email);

    // Cette vérification permet de produire une erreur métier claire.
    // L'index unique MongoDB reste le véritable dernier garde-fou.
    const existingUser = await User.exists({ emailCanonical });

    if (existingUser) {
        throw new AppError(EMAIL_ALREADY_USED_MESSAGE, 409);
    }

    // Le calcul Argon2id est effectué avant d'ouvrir la transaction
    // afin de garder la transaction MongoDB aussi courte que possible.
    const passwordHash = await hashPassword(password);

    let createdUser;

    try {
        await mongoose.connection.transaction(async (session) => {
            const [user] = await User.create(
                [
                    {
                        firstName,
                        lastName,
                        email,
                        emailCanonical,
                    },
                ],
                { session },
            );

            await AuthIdentity.create(
                [
                    {
                        user: user._id,
                        provider: AUTH_PROVIDER.LOCAL,
                        passwordHash,
                    },
                ],
                { session },
            );

            createdUser = user;
        });
    } catch (error) {
        // Deux inscriptions simultanées peuvent toutes deux réussir
        // la vérification préalable. L'index unique protège ce cas réel.
        if (
            error?.code === 11000 &&
            (error?.keyPattern?.emailCanonical ||
                error?.keyValue?.emailCanonical)
        ) {
            throw new AppError(EMAIL_ALREADY_USED_MESSAGE, 409);
        }

        throw error;
    }

    return createdUser;
};

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
         * Ce fallback est cohérent avec le traitement temporaire déjà utilisé
         * pour les erreurs de notification du changement de mot de passe.
         * Il devra rejoindre le futur système centralisé de monitoring.
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
 * Lorsque le compte est connu, il est uniquement référencé comme ressource
 * visée par la tentative.
 *
 * @param {object} input
 * @param {mongoose.Types.ObjectId|string|null} [input.targetUserId]
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
 *
 * @param {object} input Données préalablement validées par loginSchema.
 * @param {string} input.email
 * @param {string} input.password
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<{
 *   user: import('mongoose').Document,
 *   refreshToken: string
 * }>}
 */
const loginUser = async ({
    email,
    password,
    ipAddress = null,
    userAgent = null,
}) => {
    const emailCanonical = canonicalizeEmail(email);

    const user = await User.findOne({ emailCanonical });

    if (!user) {
        return rejectLoginAttempt({
            reasonCode:
                LOGIN_FAILURE_REASON.INVALID_CREDENTIALS,
            ipAddress,
            userAgent,
        });
    }

    // passwordHash est select:false dans le modèle.
    // Le login est l'un des rares endroits autorisés à le récupérer.
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

    /*
     * L'état du compte est contrôlé seulement après validation du mot
     * de passe afin de ne pas exposer son existence au client.
     */
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

    // deletion_requested reste volontairement authentifiable.
    // Le blocage des écritures métier sera géré ultérieurement
    // par un mécanisme transversal dédié.

    /*
     * L'AuthSession est conservée localement pour relier précisément
     * LOGIN_SUCCESS à la session créée. Elle ne sera pas exposée dans
     * la réponse HTTP produite par le controller.
     */
    const {
        authSession,
        refreshToken,
    } = await createInitialAuthSession({
        userId: user._id,
        ipAddress,
        userAgent,
    });

    // lastLoginAt représente le dernier login réussi.
    // AuthSession reste la source de vérité des sessions actives.
    user.lastLoginAt = new Date();

    await user.save();

    await writeLoginAuditLog({
        actor: user._id,
        action: AUDIT_ACTION.LOGIN_SUCCESS,
        entityType: AUDIT_ENTITY_TYPE.AUTH_SESSION,
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


/**
 * Termine une demande forgot-password en appliquant systématiquement
 * la compensation temporelle avant de retourner la réponse publique.
 *
 * Centraliser cette sortie évite qu'un nouveau cas métier ajouté plus tard
 * oublie accidentellement la protection contre l'énumération temporelle.
 *
 * @param {number} startedAt Temps de départ issu de performance.now().
 * @returns {Promise<{message: string}>}
 */
const completeForgotPasswordRequest = async (
    startedAt,
) => {
    await ensureMinimumDuration({
        startedAt,
        minimumMs:
            FORGOT_PASSWORD_MINIMUM_DURATION_MS,
        jitterMs:
            FORGOT_PASSWORD_JITTER_MS,
    });

    return {
        message:
            FORGOT_PASSWORD_RESPONSE_MESSAGE,
    };
};

/**
 * Initialise une procédure de réinitialisation de mot de passe.
 *
 * Règle de sécurité principale :
 * l'appelant ne doit pas pouvoir déterminer si l'adresse email existe.
 * L'absence d'utilisateur, l'absence d'identité locale ou un compte qui
 * ne peut pas utiliser ce workflow produisent donc la même réponse métier.
 *
 * Le token brut créé par createPasswordResetToken() n'est utilisé que pour
 * construire le lien envoyé par email. Il ne doit jamais être persisté,
 * retourné dans l'API ou écrit dans les logs.
 *
 * @param {object} input
 * @param {string} input.email Adresse préalablement validée.
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 *
 * @returns {Promise<{message: string}>}
 */
const forgotUserPassword = async ({
    email,
    ipAddress = null,
    userAgent = null,
}) => {
    /*
     * Le chronomètre démarre avant le premier accès aux données.
     *
     * Tous les chemins du workflow utiliseront cette même origine
     * lorsqu'ils construiront la réponse publique.
     */
    const startedAt = performance.now();
    const emailCanonical = canonicalizeEmail(email);

    /*
     * On recherche le User par son email canonique afin de conserver
     * exactement la même stratégie d'identification que register/login.
     */
    const user = await User.findOne({
        emailCanonical,
    });

    /*
     * IMPORTANT :
     * on retourne volontairement la même réponse lorsqu'aucun utilisateur
     * n'existe. Une erreur 404 révélerait l'existence ou non d'un compte.
     */
    if (!user) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    /*
     * Un reset password n'a de sens que si l'utilisateur possède une
     * identité locale avec mot de passe.
     *
     * Exemple :
     * un compte uniquement Google ne doit pas recevoir un token permettant
     * de créer implicitement un credential local sans workflow explicite.
     */
    const localIdentity = await AuthIdentity.exists({
        user: user._id,
        provider: AUTH_PROVIDER.LOCAL,
    });

    if (!localIdentity) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    /*
     * Les comptes clôturés ne doivent pas pouvoir réactiver indirectement
     * une capacité d'authentification par un reset password.
     *
     * On ne renvoie cependant aucune erreur spécifique afin de préserver
     * la protection contre l'énumération des comptes.
     */
    if (user.status === USER_STATUS.CLOSED) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    /*
     * La création du token est déléguée au service spécialisé.
     * Ce service :
     * - révoque les demandes actives précédentes ;
     * - ne persiste que le hash SHA-256 ;
     * - retourne temporairement le token brut pour construire le lien.
     */
    const { resetToken } =
        await createPasswordResetToken({
            userId: user._id,
            ipAddress,
            userAgent,
        });

    /*
     * L'origine de l'URL vient exclusivement de CLIENT_URL.
     * Aucune donnée issue du Host HTTP de la requête n'intervient ici.
     */
    const resetUrl = buildPasswordResetUrl({
        token: resetToken,
    });

    /*
     * Le template ne connaît ni User ni la configuration globale.
     * On lui transmet explicitement les données nécessaires à l'affichage.
     */
    const {
        subject,
        text,
        html,
    } = buildPasswordResetEmail({
        resetUrl,
        expiresInMinutes:
            env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
    });

    /*
     * Le transport SMTP reste derrière email.service.js.
     * Le module Auth ne dépend donc pas directement de Nodemailer.
     */
    await sendEmail({
        to: user.email,
        subject,
        text,
        html,
    });

    /*
     * Même réponse que pour une adresse inexistante ou un compte
     * sans identité locale : l'API ne révèle aucun état interne.
     */
    return completeForgotPasswordRequest(
        startedAt,
    );
};

export {
    changeUserPassword,
    forgotUserPassword,
    registerUser,
    loginUser,
    resetUserPassword,
};