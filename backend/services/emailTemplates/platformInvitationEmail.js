const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');


const buildPlatformInvitationEmail = ({
    invitationUrl,
    roleName,
    expiresInDays,
}) => {
    const safeInvitationUrl = escapeHtml(invitationUrl);
    const safeRoleName = escapeHtml(roleName);

    return {
        subject: 'Invitation à rejoindre l’équipe de la Plateforme',
        text: [
            'Vous avez été invité à rejoindre l’équipe de la Plateforme.',
            `Rôle proposé : ${roleName}`,
            '',
            `Acceptez l’invitation : ${invitationUrl}`,
            '',
            `Ce lien est valable ${expiresInDays} jours et ne peut être utilisé qu’une seule fois.`,
            'Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet email.',
        ].join('\n'),
        html: `
            <p>Vous avez été invité à rejoindre l’équipe de la Plateforme.</p>
            <p>Rôle proposé : <strong>${safeRoleName}</strong></p>
            <p><a href="${safeInvitationUrl}">Accepter l’invitation</a></p>
            <p>Ce lien est valable ${expiresInDays} jours et ne peut être utilisé qu’une seule fois.</p>
            <p>Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet email.</p>
        `,
    };
};


export { buildPlatformInvitationEmail };
