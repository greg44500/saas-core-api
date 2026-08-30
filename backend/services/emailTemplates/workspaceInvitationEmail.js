const buildWorkspaceInvitationEmail = ({
    invitationUrl,
    expiresInDays,
}) => ({
    subject: 'Invitation à rejoindre un workspace',
    text: [
        'Vous avez été invité à rejoindre un workspace.',
        '',
        `Acceptez l’invitation : ${invitationUrl}`,
        '',
        `Ce lien est valable ${expiresInDays} jours.`,
        'Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet email.',
    ].join('\n'),
    html: `
        <p>Vous avez été invité à rejoindre un workspace.</p>
        <p><a href="${invitationUrl}">Accepter l’invitation</a></p>
        <p>Ce lien est valable ${expiresInDays} jours.</p>
        <p>Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet email.</p>
    `,
});

export { buildWorkspaceInvitationEmail };
