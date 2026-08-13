
/**
 * Échappe les caractères pouvant modifier la structure HTML.
 *
 * Pourquoi :
 * - resetUrl sera normalement construite par notre propre backend ;
 * - malgré cela, le template ne doit pas supposer qu'une chaîne injectée dans
 *   un attribut HTML est toujours sûre ;
 * - cette protection évite qu'une valeur inattendue puisse casser l'attribut
 *   href ou injecter du contenu HTML.
 *
 * Cette fonction reste locale car elle répond ici à un besoin strictement lié
 * à la génération de ce template.
 */
const escapeHtml = (value) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');

/**
 * Construit le contenu de l'email de réinitialisation de mot de passe.
 *
 * Responsabilité :
 * - produire uniquement la présentation du message ;
 * - ne pas envoyer l'email ;
 * - ne pas lire les variables d'environnement ;
 * - ne pas accéder à MongoDB ;
 * - ne pas connaître User, AuthIdentity ou PasswordResetToken.
 *
 * Cette séparation permet de tester le contenu indépendamment du transport SMTP
 * et de réutiliser la même architecture pour d'autres emails transactionnels.
 *
 * @param {Object} params
 * @param {string} params.resetUrl
 * URL complète vers le frontend contenant le token brut de réinitialisation.
 * Cette URL doit avoir été construite en amont à partir d'une origine frontend
 * configurée et de confiance.
 *
 * @param {number} params.expiresInMinutes
 * Durée de validité affichée à l'utilisateur. Elle doit correspondre à la durée
 * réellement utilisée lors de la création du PasswordResetToken.
 *
 * @returns {{
 *   subject: string,
 *   text: string,
 *   html: string
 * }}
 */
const buildPasswordResetEmail = ({
    resetUrl,
    expiresInMinutes,
}) => {
    // Le texte brut conserve l'URL originale afin qu'elle reste directement
    // exploitable dans les clients email qui n'affichent pas le HTML.
    const text = [
        'Vous avez demandé la réinitialisation de votre mot de passe.',
        '',
        'Utilisez le lien suivant pour définir un nouveau mot de passe :',
        resetUrl,
        '',
        `Ce lien expire dans ${expiresInMinutes} minutes.`,
        '',
        "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
    ].join('\n');

    // L'URL est échappée uniquement pour son insertion dans le HTML.
    // Il ne faut pas remplacer resetUrl elle-même car la version texte doit
    // conserver l'URL exacte.
    const safeResetUrl = escapeHtml(resetUrl);

    const html = `
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>

        <p>
            <a href="${safeResetUrl}">
                Réinitialiser mon mot de passe
            </a>
        </p>

        <p>
            Ce lien expire dans ${expiresInMinutes} minutes.
        </p>

        <p>
            Si vous n'êtes pas à l'origine de cette demande,
            vous pouvez ignorer cet email.
        </p>
    `;

    return {
        subject: 'Réinitialisation de votre mot de passe',
        text,
        html,
    };
};

export { buildPasswordResetEmail };