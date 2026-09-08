const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const buildCommercialInvitationEmail = ({
    invitationUrl,
    planName,
    workspaceName,
    expiresInDays,
}) => {
    const safeInvitationUrl = escapeHtml(invitationUrl);
    const safePlanName = escapeHtml(planName);
    const safeWorkspaceName = escapeHtml(workspaceName);

    return {
        subject: 'Votre invitation à rejoindre la plateforme',
        text: [
            'Une offre vous a été proposée sur la plateforme.',
            `Offre : ${planName}`,
            `Espace de travail : ${workspaceName}`,
            '',
            `Consulter et accepter l’invitation : ${invitationUrl}`,
            '',
            `Ce lien est valable ${expiresInDays} jours et ne peut être utilisé qu’une seule fois.`,
            'Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet email.',
        ].join('\n'),
        html: `
            <p>Une offre vous a été proposée sur la plateforme.</p>
            <p>Offre : <strong>${safePlanName}</strong></p>
            <p>Espace de travail : <strong>${safeWorkspaceName}</strong></p>
            <p><a href="${safeInvitationUrl}">Consulter et accepter l’invitation</a></p>
            <p>Ce lien est valable ${expiresInDays} jours et ne peut être utilisé qu’une seule fois.</p>
            <p>Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet email.</p>
        `,
    };
};

export { buildCommercialInvitationEmail };
