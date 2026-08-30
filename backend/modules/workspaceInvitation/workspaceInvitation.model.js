import mongoose from 'mongoose';

import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';

const { Schema, model } = mongoose;

/**
 * Représente un droit temporaire proposé à une adresse email pour rejoindre
 * un workspace.
 *
 * Ce document ne constitue jamais une appartenance effective. Seule
 * l'acceptation future de l'invitation pourra créer ou réactiver un
 * WorkspaceMember dans une transaction dédiée.
 */
const workspaceInvitationSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },

        /**
         * Adresse normalisée utilisée pour rattacher l'invitation au compte
         * authentifié lors de l'acceptation.
         *
         * On ne duplique pas une seconde variante d'email afin de limiter les
         * données personnelles persistées à ce qui est strictement nécessaire.
         */
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
         * Empreinte du secret envoyé au destinataire.
         *
         * Le token brut n'est jamais stocké : une fuite de base ne doit pas
         * suffire pour accepter une invitation encore valide.
         */
        tokenHash: {
            type: String,
            required: true,
            immutable: true,
            minlength: 64,
            maxlength: 64,
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
            immutable: true,
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
 * Une même adresse ne peut avoir qu'une invitation encore active dans un
 * workspace. Les invitations terminées restent distinctes pour préserver la
 * traçabilité sans empêcher une invitation ultérieure.
 */
workspaceInvitationSchema.index(
    {
        workspace: 1,
        emailCanonical: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            status: WORKSPACE_INVITATION_STATUS.PENDING,
        },
        name: 'workspace_pending_invitation_email_unique',
    },
);

/**
 * Le hash identifie sans ambiguïté l'invitation lors de son acceptation.
 */
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
