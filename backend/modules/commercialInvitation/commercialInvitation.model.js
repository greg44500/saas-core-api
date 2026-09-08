import mongoose from 'mongoose';

import {
    BILLING_INTERVAL,
} from '../../constants/subscription.constants.js';
import {
    COMMERCIAL_INVITATION_DELIVERY_STATUS,
    COMMERCIAL_INVITATION_STATUS,
} from '../../constants/commercialInvitation.constants.js';

const { Schema, model } = mongoose;

const SHA256_HEX_PATTERN = /^[a-f\d]{64}$/i;

const offerSnapshotSchema = new Schema(
    {
        planName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        currency: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            minlength: 3,
            maxlength: 3,
        },
        billingInterval: {
            type: String,
            enum: Object.values(BILLING_INTERVAL),
            required: true,
        },
        priceExclTaxMinor: {
            type: Number,
            required: true,
            min: 0,
        },
        trialEnabled: {
            type: Boolean,
            required: true,
        },
        trialDurationDays: {
            type: Number,
            default: null,
        },
        features: {
            type: [String],
            default: [],
        },
        limits: {
            type: Map,
            of: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        _id: false,
    },
);

/**
 * Proposition commerciale temporaire destinée à l'onboarding initial d'un
 * futur client. Elle ne porte aucun droit runtime : après acceptation, seuls
 * Subscription -> Plan (+ overrides éventuels) font autorité.
 */
const commercialInvitationSchema = new Schema(
    {
        emailCanonical: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
            immutable: true,
        },
        plan: {
            type: Schema.Types.ObjectId,
            ref: 'Plan',
            required: true,
            immutable: true,
        },
        workspaceName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
            immutable: true,
        },
        /**
         * Justification administrative de l'accès privé accordé. Elle reste
         * interne à la Plateforme et participe à la traçabilité commerciale.
         */
        reason: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 500,
            immutable: true,
        },
        /**
         * Seul le hash SHA-256 du secret est persisté. Il reste modifiable
         * uniquement pour permettre un resend qui invalide l'ancien lien.
         */
        tokenHash: {
            type: String,
            required: true,
            minlength: 64,
            maxlength: 64,
            match: [
                SHA256_HEX_PATTERN,
                'Le hash de l’invitation commerciale est invalide.',
            ],
        },
        status: {
            type: String,
            enum: Object.values(COMMERCIAL_INVITATION_STATUS),
            default: COMMERCIAL_INVITATION_STATUS.PENDING,
            required: true,
        },
        deliveryStatus: {
            type: String,
            enum: Object.values(COMMERCIAL_INVITATION_DELIVERY_STATUS),
            default: COMMERCIAL_INVITATION_DELIVERY_STATUS.PENDING,
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
        expiresAt: {
            type: Date,
            required: true,
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        acceptedAt: {
            type: Date,
            default: null,
        },
        acceptedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            default: null,
        },
        subscription: {
            type: Schema.Types.ObjectId,
            ref: 'Subscription',
            default: null,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
        revokedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        revokeReason: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        offerSnapshot: {
            type: offerSnapshotSchema,
            required: true,
            immutable: true,
        },
    },
    {
        timestamps: true,
    },
);

commercialInvitationSchema.index(
    { tokenHash: 1 },
    { unique: true, name: 'commercial_invitation_token_hash_unique' },
);

commercialInvitationSchema.index(
    { emailCanonical: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: COMMERCIAL_INVITATION_STATUS.PENDING,
        },
        name: 'commercial_invitation_pending_email_unique',
    },
);

commercialInvitationSchema.index({ status: 1, expiresAt: 1 });
commercialInvitationSchema.index({ plan: 1, status: 1 });

const CommercialInvitation = model(
    'CommercialInvitation',
    commercialInvitationSchema,
);

export { CommercialInvitation };
