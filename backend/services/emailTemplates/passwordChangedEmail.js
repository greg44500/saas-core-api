/**
 * Construit l'email de sécurité envoyé après
 * une modification réussie du mot de passe.
 *
 * Responsabilité :
 * - produire uniquement le contenu du message ;
 * - ne pas envoyer l'email ;
 * - ne pas accéder à MongoDB ;
 * - ne pas connaître AuthSession ou PasswordResetToken ;
 * - ne jamais recevoir le mot de passe ou le token de reset.
 *
 * Cet email est informatif :
 * le changement de mot de passe a déjà été effectué
 * lorsque ce template est utilisé.
 *
 * @returns {{
 *   subject: string,
 *   text: string,
 *   html: string
 * }}
 */
const buildPasswordChangedEmail = () => {
    /*
     * Aucun mot de passe, token ou lien sensible ne doit apparaître
     * dans cette notification.
     *
     * L'objectif est uniquement d'informer l'utilisateur
     * d'un événement de sécurité concernant son compte.
     */
    const text = [
        'Le mot de passe de votre compte a été modifié.',
        '',
        'Toutes vos sessions actives ont été déconnectées par mesure de sécurité.',
        '',
        "Si vous êtes à l'origine de cette modification, aucune action supplémentaire n'est nécessaire.",
        '',
        "Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement le support.",
    ].join('\n');

    const html = `
        <p>
            Le mot de passe de votre compte a été modifié.
        </p>

        <p>
            Toutes vos sessions actives ont été déconnectées
            par mesure de sécurité.
        </p>

        <p>
            Si vous êtes à l'origine de cette modification,
            aucune action supplémentaire n'est nécessaire.
        </p>

        <p>
            Si vous n'êtes pas à l'origine de cette modification,
            contactez immédiatement le support.
        </p>
    `;

    return {
        subject:
            'Votre mot de passe a été modifié',
        text,
        html,
    };
};

export { buildPasswordChangedEmail };