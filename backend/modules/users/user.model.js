// backend/modules/users/user.model.js

import mongoose from 'mongoose';

import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 100,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            maxlength: 254,
        },

        emailCanonical: {
            type: String,
            required: true,
            trim: true,
            maxlength: 254,
        },

        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_STATUS.ACTIVE,
            required: true,
        },

        platformRole: {
            type: String,
            enum: Object.values(PLATFORM_ROLE),
            default: PLATFORM_ROLE.USER,
            required: true,
        },

        emailVerifiedAt: {
            type: Date,
            default: null,
        },

        passwordChangedAt: {
            type: Date,
            default: null,
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },

        disabledAt: {
            type: Date,
            default: null,
            required() {
                return this.status === USER_STATUS.DISABLED;
            },
        },

        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        disabledReason: {
            type: String,
            trim: true,
            default: null,
            maxlength: 500,
        },

        deletionRequestedAt: {
            type: Date,
            default: null,
            required() {
                return this.status === USER_STATUS.DELETION_REQUESTED;
            },
        },

        deletionRequestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        closedAt: {
            type: Date,
            default: null,
            required() {
                return this.status === USER_STATUS.CLOSED;
            },
        },

        closedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        closureReason: {
            type: String,
            trim: true,
            default: null,
            maxlength: 500,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

userSchema.index(
    { emailCanonical: 1 },
    {
        unique: true,
        name: 'user_email_canonical_unique',
    },
);

userSchema.index({ status: 1 });
userSchema.index({ platformRole: 1 });

const User = mongoose.model('User', userSchema);

export { User };