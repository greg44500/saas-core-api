import mongoose from 'mongoose';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';

const authIdentitySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        provider: {
            type: String,
            enum: Object.values(AUTH_PROVIDER),
            required: true,
        },

        providerUserId: {
            type: String,
            trim: true,
        },

        passwordHash: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
    },
);

authIdentitySchema.pre('validate', function () {
    if (this.provider === AUTH_PROVIDER.LOCAL) {
        if (!this.passwordHash) {
            this.invalidate(
                'passwordHash',
                'passwordHash is required for a local authentication identity.',
            );
        }

        if (this.providerUserId !== undefined) {
            this.invalidate(
                'providerUserId',
                'providerUserId must not be defined for a local authentication identity.',
            );
        }
    }

    if (this.provider === AUTH_PROVIDER.GOOGLE) {
        if (!this.providerUserId) {
            this.invalidate(
                'providerUserId',
                'providerUserId is required for a Google authentication identity.',
            );
        }

        if (this.passwordHash !== undefined) {
            this.invalidate(
                'passwordHash',
                'passwordHash must not be defined for a Google authentication identity.',
            );
        }
    }
});

authIdentitySchema.index(
    { user: 1, provider: 1 },
    { unique: true },
);

authIdentitySchema.index(
    { provider: 1, providerUserId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            provider: AUTH_PROVIDER.GOOGLE,
            providerUserId: { $type: 'string' },
        },
    },
);

export const AuthIdentity = mongoose.model(
    'AuthIdentity',
    authIdentitySchema,
);