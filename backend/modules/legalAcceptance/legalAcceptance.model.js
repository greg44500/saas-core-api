import mongoose from 'mongoose';

import {
    LEGAL_ACCEPTANCE_SOURCE,
} from '../../constants/legalDocuments.constants.js';

const legalAcceptanceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
            index: true,
        },
        termsVersion: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            maxlength: 50,
        },
        privacyPolicyVersion: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            maxlength: 50,
        },
        acceptedAt: {
            type: Date,
            required: true,
            immutable: true,
        },
        source: {
            type: String,
            enum: Object.values(LEGAL_ACCEPTANCE_SOURCE),
            required: true,
            immutable: true,
        },
        ipAddress: {
            type: String,
            default: null,
            immutable: true,
            maxlength: 100,
        },
        userAgent: {
            type: String,
            default: null,
            immutable: true,
            maxlength: 1000,
        },
    },
    {
        timestamps: true,
    },
);

legalAcceptanceSchema.index({ user: 1, acceptedAt: -1 });
legalAcceptanceSchema.index({ termsVersion: 1, privacyPolicyVersion: 1 });

const LegalAcceptance = mongoose.model(
    'LegalAcceptance',
    legalAcceptanceSchema,
);

export { LegalAcceptance };
