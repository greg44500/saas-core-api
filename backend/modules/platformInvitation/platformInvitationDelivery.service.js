import {
    PLATFORM_INVITATION_DELIVERY_STATUS,
    PLATFORM_INVITATION_TTL_DAYS,
} from '../../constants/platformTeam.constants.js';
import { sendEmail } from '../../services/email.service.js';
import {
    buildPlatformInvitationEmail,
} from '../../services/emailTemplates/platformInvitationEmail.js';
import { PlatformInvitation } from './platformInvitation.model.js';
import {
    buildPlatformInvitationUrl,
} from './platformInvitationUrl.js';


/**
 * Le secret brut n'existe que pendant la livraison courante. Il n'est jamais
 * persisté ni loggé. Un échec SMTP conserve l'invitation afin de permettre un
 * resend explicite qui générera un nouveau secret.
 */
const deliverPlatformInvitation = async ({
    invitation,
    role,
    token,
    now = new Date(),
}) => {
    if (
        !invitation?._id
        || !invitation.emailCanonical
        || !role?.name
        || !token
    ) {
        throw new TypeError(
            'invitation, role and token are required to deliver a platform invitation',
        );
    }

    const invitationUrl = buildPlatformInvitationUrl({ token });
    const email = buildPlatformInvitationEmail({
        invitationUrl,
        roleName: role.name,
        expiresInDays: PLATFORM_INVITATION_TTL_DAYS,
    });

    let deliveryStatus;

    try {
        await sendEmail({
            to: invitation.emailCanonical,
            subject: email.subject,
            text: email.text,
            html: email.html,
        });

        deliveryStatus = PLATFORM_INVITATION_DELIVERY_STATUS.SENT;
    } catch {
        deliveryStatus = PLATFORM_INVITATION_DELIVERY_STATUS.FAILED;
    }

    const deliveredAt =
        deliveryStatus === PLATFORM_INVITATION_DELIVERY_STATUS.SENT
            ? now
            : null;

    const updatedInvitation = await PlatformInvitation.findByIdAndUpdate(
        invitation._id,
        {
            $set: {
                deliveryStatus,
                lastDeliveryAttemptAt: now,
                deliveredAt,
            },
        },
        {
            returnDocument: 'after',
            runValidators: true,
        },
    );

    return updatedInvitation ?? invitation;
};


export { deliverPlatformInvitation };
