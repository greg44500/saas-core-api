import crypto from 'node:crypto';

import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    WORKSPACE_INVITATION_DELIVERY_STATUS,
    WORKSPACE_INVITATION_STATUS,
    WORKSPACE_INVITATION_TOKEN_BYTES,
    WORKSPACE_INVITATION_TTL_DAYS,
} from '../../constants/workspaceInvitation.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { WorkspaceInvitation } from './workspaceInvitation.model.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const generateToken = () => crypto
    .randomBytes(WORKSPACE_INVITATION_TOKEN_BYTES)
    .toString('hex');

const hashToken = (token) => crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

/**
 * Renouvelle le secret d'une invitation encore pending.
 *
 * Remplacer le hash avant tout nouvel envoi invalide immédiatement l'ancien
 * lien. La nouvelle tentative repart sur une fenêtre complète de sept jours.
 */
const resendWorkspaceInvitation = async ({
    workspaceId,
    invitationId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!workspaceId || !invitationId || !actorId) {
        throw new TypeError(
            'workspaceId, invitationId and actorId are required to resend a workspace invitation',
        );
    }

    const token = generateToken();
    const expiresAt = new Date(
        now.getTime()
        + WORKSPACE_INVITATION_TTL_DAYS * DAY_IN_MS,
    );

    return mongoose.connection.transaction(async (session) => {
        const invitation = await WorkspaceInvitation.findOne({
            _id: invitationId,
            workspace: workspaceId,
            status: WORKSPACE_INVITATION_STATUS.PENDING,
            expiresAt: mongoose.trusted({ $gt: now }),
        }).session(session);

        if (!invitation) {
            throw new AppError(
                'Cette invitation est introuvable ou n’est plus active.',
                409,
            );
        }

        invitation.tokenHash = hashToken(token);
        invitation.expiresAt = expiresAt;
        invitation.deliveryStatus =
            WORKSPACE_INVITATION_DELIVERY_STATUS.PENDING;
        invitation.lastDeliveryAttemptAt = null;
        invitation.deliveredAt = null;

        await invitation.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.MEMBER_INVITATION_RESENT,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: { expiresAt },
            },
            { session },
        );

        return { invitation, token };
    });
};

export { resendWorkspaceInvitation };
