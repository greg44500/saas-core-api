import mongoose from 'mongoose';

import {
    WORKSPACE_INVITATION_DELIVERY_STATUS,
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';

const { Schema, model } = mongoose;

const workspaceInvitationSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        emailCanonical: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
            immutable: true,
        },
        role: {
            type: Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(WORKSPACE_INVITATION_STATUS),
            default: WORKSPACE_INVITATION_STATUS.PENDING,
            required: true,
        },
        /**
         * Ce hash doit rester modifiable : un resend invalide l'ancien secret
         * en le remplaçant par un nouveau token hashé.
         */
        tokenHash: {
            type: String,
            required: true,
            minlength: 64,
            maxlength: 64,
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        /**
         * La nouvelle tentative de livraison repart sur une nouvelle fenêtre
         * de validité, donc expiresAt est volontairement mutable.
         */
        expiresAt: {
            type: Date,
            required: true,
        },
        deliveryStatus: {
            type: String,
            enum: Object.values(WORKSPACE_INVITATION_DELIVERY_STATUS),
            default: WORKSPACE_INVITATION_DELIVERY_STATUS.PENDING,
            required: true,
        },
        lastDeliveryAttemptAt: {
            type: Date,
            default: null,
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
        acceptedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        acceptedAt: {
            type: Date,
            default: null,
        },
        revokedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

workspaceInvitationSchema.index(
    { workspace: 1, emailCanonical: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: WORKSPACE_INVITATION_STATUS.PENDING,
        },
        name: 'workspace_pending_invitation_email_unique',
    },
);

workspaceInvitationSchema.index(
    { tokenHash: 1 },
    {
        unique: true,
        name: 'workspace_invitation_token_hash_unique',
    },
);

workspaceInvitationSchema.index({
    workspace: 1,
    status: 1,
    expiresAt: 1,
});

const WorkspaceInvitation = model(
    'WorkspaceInvitation',
    workspaceInvitationSchema,
);

export { WorkspaceInvitation };
