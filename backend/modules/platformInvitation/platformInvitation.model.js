import mongoose from 'mongoose';

import {
    PLATFORM_INVITATION_DELIVERY_STATUS,
    PLATFORM_INVITATION_STATUS,
} from '../../constants/platformTeam.constants.js';


const { Schema, model } = mongoose;

const SHA256_HEX_PATTERN = /^[a-f\d]{64}$/i;


const platformInvitationSchema = new Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 100,
            immutable: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 100,
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
            ref: 'PlatformRole',
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(PLATFORM_INVITATION_STATUS),
            default: PLATFORM_INVITATION_STATUS.PENDING,
            required: true,
        },
        /**
         * Seul le hash SHA-256 du secret temporaire est persisté.
         * Un resend remplace ce hash et invalide immédiatement l'ancien lien.
         */
        tokenHash: {
            type: String,
            required: true,
            minlength: 64,
            maxlength: 64,
            match: [
                SHA256_HEX_PATTERN,
                'Le hash de l’invitation Platform est invalide.',
            ],
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        deliveryStatus: {
            type: String,
            enum: Object.values(PLATFORM_INVITATION_DELIVERY_STATUS),
            default: PLATFORM_INVITATION_DELIVERY_STATUS.PENDING,
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

/**
 * Une adresse ne peut avoir qu'une invitation Platform PENDING à la fois.
 * L'expiration applicative est normalisée avant toute nouvelle création.
 */
platformInvitationSchema.index(
    { emailCanonical: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: PLATFORM_INVITATION_STATUS.PENDING,
        },
        name: 'platform_pending_invitation_email_unique',
    },
);

platformInvitationSchema.index(
    { tokenHash: 1 },
    {
        unique: true,
        name: 'platform_invitation_token_hash_unique',
    },
);

platformInvitationSchema.index({
    status: 1,
    expiresAt: 1,
    createdAt: -1,
});


const PlatformInvitation = model(
    'PlatformInvitation',
    platformInvitationSchema,
);


export { PlatformInvitation };
