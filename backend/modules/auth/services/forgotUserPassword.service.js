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
 * L'appelant ne doit pas pouvoir déterminer si l'adresse email existe.
 * L'absence d'utilisateur, l'absence d'identité locale ou un compte qui
 * ne peut pas utiliser ce workflow produisent donc la même réponse métier.
 *
 * Le token brut créé par createPasswordResetToken() est utilisé uniquement
 * pour construire le lien envoyé par email. Il ne doit jamais être persisté,
 * retourné par l'API ou écrit dans les logs.
 *
 * @param {object} input
 * @param {string} input.email Adresse préalablement validée.
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<{message: string}>}
 */
const forgotUserPassword = async ({
    email,
    ipAddress = null,
    userAgent = null,
}) => {
    /*
     * Le chronomètre démarre avant le premier accès aux données.
     * Tous les chemins du workflow utiliseront cette même origine.
     */
    const startedAt = performance.now();
    const emailCanonical = canonicalizeEmail(email);

    /*
     * La recherche utilise la même représentation canonique
     * de l'adresse que les workflows register et login.
     */
    const user = await User.findOne({
        emailCanonical,
    });

    /*
     * Une adresse inconnue produit volontairement la même réponse
     * qu'une adresse connue afin de ne pas révéler l'existence du compte.
     */
    if (!user) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    /*
     * Ce workflow est réservé aux utilisateurs possédant déjà une
     * identité locale. Il ne doit pas créer implicitement un credential
     * local pour un compte utilisant uniquement un fournisseur externe.
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
     * Un compte clôturé ne peut pas restaurer sa capacité
     * d'authentification au moyen d'un reset de mot de passe.
     *
     * Le refus reste invisible dans la réponse publique afin de
     * préserver la protection contre l'énumération des comptes.
     */
    if (user.status === USER_STATUS.CLOSED) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    /*
     * Le service spécialisé révoque les demandes actives précédentes,
     * ne persiste que le hash du token et retourne temporairement
     * le token brut nécessaire à la construction du lien.
     */
    const { resetToken } =
        await createPasswordResetToken({
            userId: user._id,
            ipAddress,
            userAgent,
        });

    /*
     * L'origine du lien provient exclusivement de CLIENT_URL.
     * Le Host transmis par la requête HTTP n'est jamais utilisé.
     */
    const resetUrl = buildPasswordResetUrl({
        token: resetToken,
    });

    /*
     * Le template reçoit uniquement les données nécessaires
     * et ne dépend ni du modèle User ni de la configuration globale.
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
     * Le transport SMTP reste encapsulé par email.service.js.
     * Le domaine Auth ne dépend donc pas directement de Nodemailer.
     */
    await sendEmail({
        to: user.email,
        subject,
        text,
        html,
    });

    /*
     * Tous les résultats métier produisent la même réponse publique.
     */
    return completeForgotPasswordRequest(
        startedAt,
    );
};

export {
    forgotUserPassword,
};
