import mongoose from 'mongoose';

import {
    PLATFORM_ROLE_STATUS,
} from '../../constants/platformTeam.constants.js';


const { Schema, model } = mongoose;

const PLATFORM_ROLE_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;
const PLATFORM_PERMISSION_PATTERN =
    /^platform:[a-z0-9_]+(?::[a-z0-9_]+)+$/;


/**
 * Rôle d'administration global de la Plateforme.
 *
 * Ce modèle est volontairement distinct de Role, qui reste strictement
 * Workspace-scoped. Il constitue la cible des futurs PlatformTeamMember et
 * PlatformInvitation.
 */
const platformRoleSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            immutable: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 2,
            maxlength: 80,
            match: [
                PLATFORM_ROLE_KEY_PATTERN,
                'Le format de la clé du rôle Platform est invalide.',
            ],
        },
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        description: {
            type: String,
            default: null,
            trim: true,
            maxlength: 500,
        },
        permissions: {
            type: [
                {
                    type: String,
                    trim: true,
                    lowercase: true,
                    match: [
                        PLATFORM_PERMISSION_PATTERN,
                        'Le format de la permission Platform est invalide.',
                    ],
                },
            ],
            default: [],
        },
        isSystem: {
            type: Boolean,
            default: false,
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(PLATFORM_ROLE_STATUS),
            default: PLATFORM_ROLE_STATUS.ACTIVE,
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        archivedAt: {
            type: Date,
            default: null,
        },
        archivedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

platformRoleSchema.index({
    status: 1,
    isSystem: 1,
});


const PlatformRole = model(
    'PlatformRole',
    platformRoleSchema,
);


export { PlatformRole };
