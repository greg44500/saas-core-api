import {
    COMMERCIAL_INVITATION_DELIVERY_STATUS,
    COMMERCIAL_INVITATION_TTL_DAYS,
} from '../../constants/commercialInvitation.constants.js';
import { sendEmail } from '../../services/email.service.js';
import {
    buildCommercialInvitationEmail,
} from '../../services/emailTemplates/commercialInvitationEmail.js';
import { CommercialInvitation } from './commercialInvitation.model.js';
import {
    buildCommercialInvitationUrl,
} from './commercialInvitationUrl.js';

/**
 * Le secret brut ne vit que pendant la tentative de livraison courante. Un
 * échec SMTP ne réexpose jamais le token ; un resend explicite en générera un
 * nouveau et invalidera l'ancien.
 */
const deliverCommercialInvitation = async ({
    invitation,
    plan,
    token,
    now = new Date(),
}) => {
    if (!invitation?._id || !plan?.name || !token) {
        throw new TypeError(
            'invitation, plan and token are required to deliver a commercial invitation',
        );
    }

    const invitationUrl = buildCommercialInvitationUrl({ token });
    const email = buildCommercialInvitationEmail({
        invitationUrl,
        planName: plan.name,
        workspaceName: invitation.workspaceName,
        expiresInDays: COMMERCIAL_INVITATION_TTL_DAYS,
    });

    let deliveryStatus;

    try {
        await sendEmail({
            to: invitation.emailCanonical,
            subject: email.subject,
            text: email.text,
            html: email.html,
        });
        deliveryStatus = COMMERCIAL_INVITATION_DELIVERY_STATUS.SENT;
    } catch {
        deliveryStatus = COMMERCIAL_INVITATION_DELIVERY_STATUS.FAILED;
    }

    return CommercialInvitation.findByIdAndUpdate(
        invitation._id,
        {
            $set: {
                deliveryStatus,
                lastDeliveryAttemptAt: now,
                deliveredAt:
                    deliveryStatus === COMMERCIAL_INVITATION_DELIVERY_STATUS.SENT
                        ? now
                        : null,
            },
        },
        {
            returnDocument: 'after',
            runValidators: true,
        },
    );
};

export { deliverCommercialInvitation };
