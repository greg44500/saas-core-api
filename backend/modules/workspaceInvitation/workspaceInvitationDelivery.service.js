import {
    WORKSPACE_INVITATION_DELIVERY_STATUS,
    WORKSPACE_INVITATION_TTL_DAYS,
} from '../../constants/workspaceInvitation.constants.js';
import { sendEmail } from '../../services/email.service.js';
import {
    buildWorkspaceInvitationEmail,
} from '../../services/emailTemplates/workspaceInvitationEmail.js';
import {
    WorkspaceInvitation,
} from './workspaceInvitation.model.js';
import {
    buildWorkspaceInvitationUrl,
} from './workspaceInvitationUrl.js';

/**
 * Envoie le secret brut uniquement pendant la requête courante puis persiste
 * le résultat du transport. Le token n'est ni loggé ni stocké.
 *
 * Un échec SMTP ne supprime pas l'invitation : le frontend doit pouvoir
 * constater deliveryStatus=failed et proposer un resend contrôlé.
 */
const deliverWorkspaceInvitation = async ({
    invitation,
    token,
    now = new Date(),
}) => {
    if (!invitation?._id || !invitation.emailCanonical || !token) {
        throw new TypeError(
            'invitation and token are required to deliver a workspace invitation',
        );
    }

    const invitationUrl = buildWorkspaceInvitationUrl({ token });
    const email = buildWorkspaceInvitationEmail({
        invitationUrl,
        expiresInDays: WORKSPACE_INVITATION_TTL_DAYS,
    });

    try {
        await sendEmail({
            to: invitation.emailCanonical,
            subject: email.subject,
            text: email.text,
            html: email.html,
        });

        const deliveredInvitation =
            await WorkspaceInvitation.findByIdAndUpdate(
                invitation._id,
                {
                    $set: {
                        deliveryStatus:
                            WORKSPACE_INVITATION_DELIVERY_STATUS.SENT,
                        lastDeliveryAttemptAt: now,
                        deliveredAt: now,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            );

        return deliveredInvitation ?? invitation;
    } catch {
        const failedInvitation =
            await WorkspaceInvitation.findByIdAndUpdate(
                invitation._id,
                {
                    $set: {
                        deliveryStatus:
                            WORKSPACE_INVITATION_DELIVERY_STATUS.FAILED,
                        lastDeliveryAttemptAt: now,
                        deliveredAt: null,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            );

        return failedInvitation ?? invitation;
    }
};

export { deliverWorkspaceInvitation };
