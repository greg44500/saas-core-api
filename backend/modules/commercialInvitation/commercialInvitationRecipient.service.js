import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    COMMERCIAL_INVITATION_STATUS,
} from '../../constants/commercialInvitation.constants.js';
import {
    LEGAL_ACCEPTANCE_SOURCE,
} from '../../constants/legalDocuments.constants.js';
import { AppError } from '../../utils/appError.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { registerUser } from '../auth/auth.service.js';
import { Plan } from '../plan/plan.model.js';
import { User } from '../users/user.model.js';
import { CommercialInvitation } from './commercialInvitation.model.js';
import {
    assertCommercialInvitationOfferIsCurrent,
    hashCommercialInvitationToken,
} from './commercialInvitation.service.js';

const RECIPIENT_MISMATCH_MESSAGE =
    'Cette invitation est réservée à une autre adresse email';

const loadActiveInvitation = async ({
    token,
    now = new Date(),
    session = null,
}) => {
    const invitation = await CommercialInvitation.findOne({
        tokenHash: hashCommercialInvitationToken(token),
        status: COMMERCIAL_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({ $gt: now }),
    }).session(session);

    if (!invitation) {
        throw new AppError('Invitation commerciale invalide ou expirée', 404);
    }

    return invitation;
};

const assertRecipientEmailMatches = ({ invitation, email }) => {
    if (canonicalizeEmail(email) !== invitation.emailCanonical) {
        throw new AppError(RECIPIENT_MISMATCH_MESSAGE, 403);
    }
};

const registerCommercialInvitationRecipient = async ({
    token,
    firstName,
    lastName,
    email,
    password,
    legalAccepted,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    const invitation = await loadActiveInvitation({ token, now });
    assertRecipientEmailMatches({ invitation, email });

    const plan = await Plan.findById(invitation.plan);
    if (!plan) {
        throw new AppError('Le plan associé à l’invitation est introuvable', 409);
    }

    assertCommercialInvitationOfferIsCurrent({ invitation, plan });

    return registerUser({
        firstName,
        lastName,
        email,
        password,
        legalAccepted,
        legalAcceptanceSource:
            LEGAL_ACCEPTANCE_SOURCE.COMMERCIAL_INVITATION_REGISTRATION,
        ipAddress,
        userAgent,
    });
};

const verifyCommercialInvitationRecipient = async ({
    token,
    userId,
    now = new Date(),
}) => {
    const [invitation, user] = await Promise.all([
        loadActiveInvitation({ token, now }),
        User.findById(userId).select('emailCanonical'),
    ]);

    if (!user) {
        throw new AppError('Utilisateur introuvable', 404);
    }

    assertRecipientEmailMatches({
        invitation,
        email: user.emailCanonical,
    });

    return invitation;
};

const declineCommercialInvitation = async ({
    token,
    userId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => mongoose.connection.transaction(async (session) => {
    const user = await User.findById(userId)
        .select('emailCanonical')
        .session(session);

    if (!user) {
        throw new AppError('Utilisateur introuvable', 404);
    }

    const tokenHash = hashCommercialInvitationToken(token);
    const invitation = await CommercialInvitation.findOne({
        tokenHash,
        status: COMMERCIAL_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({ $gt: now }),
    }).session(session);

    if (!invitation) {
        throw new AppError('Invitation commerciale invalide ou expirée', 404);
    }

    assertRecipientEmailMatches({
        invitation,
        email: user.emailCanonical,
    });

    const declinedInvitation = await CommercialInvitation.findOneAndUpdate(
        {
            _id: invitation._id,
            tokenHash,
            status: COMMERCIAL_INVITATION_STATUS.PENDING,
        },
        {
            $set: {
                status: COMMERCIAL_INVITATION_STATUS.DECLINED,
                declinedAt: now,
                declinedBy: user._id,
            },
        },
        { returnDocument: 'after', runValidators: true, session },
    );

    if (!declinedInvitation) {
        throw new AppError('Invitation commerciale modifiée concurremment', 409);
    }

    await createAuditLog(
        {
            actor: user._id,
            action: AUDIT_ACTION.COMMERCIAL_INVITATION_DECLINED,
            entityType: AUDIT_ENTITY_TYPE.COMMERCIAL_INVITATION,
            entityId: declinedInvitation._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                beneficiaryEmailCanonical: invitation.emailCanonical,
            },
        },
        { session },
    );

    return declinedInvitation;
});

export {
    RECIPIENT_MISMATCH_MESSAGE,
    declineCommercialInvitation,
    registerCommercialInvitationRecipient,
    verifyCommercialInvitationRecipient,
};
