import { performance } from 'node:perf_hooks';

import { env } from '../../../config/env.js';
import {
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';
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

const forgotUserPassword = async ({
    email,
    ipAddress = null,
    userAgent = null,
}) => {
    const startedAt = performance.now();
    const emailCanonical = canonicalizeEmail(email);

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

    const { resetToken } =
        await createPasswordResetToken({
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

    await sendEmail({
        to: user.email,
        subject,
        text,
        html,
    });

    return completeForgotPasswordRequest(
        startedAt,
    );
};

export {
    forgotUserPassword,
};
