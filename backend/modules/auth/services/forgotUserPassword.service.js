import { performance } from 'node:perf_hooks';

import { env } from '../../../config/env.js';
import {
    AUDIT_ACTION,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';
import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';
import {
    buildPasswordResetEmail,
} from '../../../services/emailTemplates/passwordResetEmail.js';
import {
    sendEmail,
} from '../../../services/email.service.js';
import {
    canonicalizeEmail,
} from '../../../utils/canonicalizeEmail.js';
import {
    ensureMinimumDuration,
} from '../../../utils/securityTiming.js';
import {
    AuthIdentity,
} from '../../authIdentities/authIdentity.model.js';
import {
    createPasswordResetToken,
    revokePasswordResetToken,
} from '../../passwordResetTokens/passwordResetToken.service.js';
import { User } from '../../users/user.model.js';
import {
    buildPasswordResetUrl,
} from '../passwordResetUrl.js';

const FORGOT_PASSWORD_RESPONSE_MESSAGE =
    'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.';

/*
 * Compensation temporelle du workflow forgot-password.
 *
 * Le but n'est pas d'obtenir un temps d'exécution cryptographiquement
 * constant, mais de réduire l'écart observable entre :
 * - une adresse inconnue qui quitte rapidement le workflow ;
 * - un compte valide qui réalise plusieurs accès DB puis un envoi SMTP.
 *
 * Ces valeurs devront être réévaluées lorsque les emails seront
 * délégués à une file de tâches durable.
 */
const FORGOT_PASSWORD_MINIMUM_DURATION_MS = 700;
const FORGOT_PASSWORD_JITTER_MS = 150;

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
 * Tente d'auditer une demande publique de récupération.
 *
 * L'audit reste volontairement anonyme afin de ne pas créer de différence
 * entre une adresse inconnue, un compte non local et un compte éligible.
 *
 * Une panne de l'AuditLog ne doit jamais modifier la réponse publique.
 *
 * @param {object} auditData
 * @returns {Promise<void>}
 */
const writeForgotPasswordAuditLog = async (
    auditData,
) => {
    try {
        await createAuditLog(auditData);
    } catch (error) {
        /*
         * Aucun email, token ou autre secret n'est journalisé.
         */
        console.error(
            'Password recovery audit log creation failed',
            {
                action: auditData.action,
                errorName: error?.name,
            },
        );
    }
};
/**
 * Lance le workflow public de récupération de mot de passe sans révéler
 * l'existence, le statut ou le provider d'authentification d'un compte.
 *
 * Le service renvoie volontairement le même message pour une adresse inconnue,
 * un compte sans identité locale ou un compte dont la fermeture est engagée.
 * Une compensation temporelle réduit en parallèle les différences observables
 * entre ces branches et le chemin qui crée puis envoie réellement un token.
 *
 * Seul `createPasswordResetToken` persiste l'empreinte du token ; le token brut
 * reste en mémoire le temps de construire l'URL et l'email. Le frontend ne
 * décide jamais si un compte est éligible à la récupération.
 *
 * @param {object} input
 * @param {string} input.email Adresse à canonicaliser avant recherche.
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<{message: string}>}
 */
const forgotUserPassword = async ({
    email,
    ipAddress = null,
    userAgent = null,
}) => {
    const startedAt = performance.now();
    const emailCanonical = canonicalizeEmail(email);
    await writeForgotPasswordAuditLog({
        actor: null,
        action:
            AUDIT_ACTION.FORGOT_PASSWORD_REQUESTED,
        entityType: null,
        entityId: null,
        status: AUDIT_STATUS.SUCCESS,
        ipAddress,
        userAgent,
        metadata: {},
    });

    const user = await User.findOne({
        emailCanonical,
    });

    if (!user) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

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
     * Une fermeture engagée est déjà un état fonctionnel bloquant.
     * Comme pour CLOSED, aucune nouvelle procédure de récupération ne doit
     * créer un credential susceptible de prolonger artificiellement le compte.
     * Le refus reste invisible afin de conserver l'anti-énumération.
     */
    if (
        user.status === USER_STATUS.DELETION_REQUESTED
        || user.status === USER_STATUS.CLOSED
    ) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    const {
        passwordResetToken,
        resetToken,
    } = await createPasswordResetToken({
        userId: user._id,
        ipAddress,
        userAgent,
    });

    const resetUrl = buildPasswordResetUrl({
        token: resetToken,
    });

    const {
        subject,
        text,
        html,
    } = buildPasswordResetEmail({
        resetUrl,
        expiresInMinutes:
            env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
    });

    try {
        await sendEmail({
            to: user.email,
            subject,
            text,
            html,
        });
    } catch (error) {
        /*
         * Le token n'a pas pu être remis à l'utilisateur.
         * Il ne doit donc pas rester utilisable inutilement.
         */
        try {
            await revokePasswordResetToken({
                passwordResetTokenId:
                    passwordResetToken._id,
            });
        } catch (revocationError) {
            /*
             * La compensation ne doit jamais casser l'anti-énumération.
             * Aucun token, email ou autre secret n'est journalisé.
             */
            console.error(
                'Password reset token compensation failed',
                {
                    errorName:
                        revocationError?.name,
                },
            );
        }

        /*
         * L'échec SMTP reste interne.
         * La réponse publique doit être identique à celle d'une
         * adresse inconnue.
         */
        console.error(
            'Password reset email failed',
            {
                errorName: error?.name,
            },
        );
    }

    return completeForgotPasswordRequest(
        startedAt,
    );
};

export {
    forgotUserPassword,
};
