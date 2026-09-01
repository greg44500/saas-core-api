import mongoose from 'mongoose';


const { Schema, model } = mongoose;


/**
 * Format commun des identifiants fonctionnels.
 *
 * Exemples valides :
 * - owner
 * - price_manager
 * - regional-admin
 */
const ROLE_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;

/**
 * Format structurel d’une permission.
 *
 * Une permission contient au minimum deux segments séparés par `:`.
 * Des segments intermédiaires sont autorisés pour représenter proprement
 * certaines actions de gouvernance sans écraser leur sens métier.
 *
 * Exemples valides :
 * - workspace:read
 * - member:suspend
 * - workspace:ownership:transfer
 * - product:catalog:update
 */
const PERMISSION_PATTERN =
    /^[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)+$/;


/**
 * Représente un groupe de permissions propre à un workspace.
 *
 * Un rôle ne donne aucun droit global sur la plateforme. Il est attribué à un
 * utilisateur par l’intermédiaire de son WorkspaceMember.
 */
const roleSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        key: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            lowercase: true,
            minlength: 2,
            maxlength: 64,
            match: [ROLE_KEY_PATTERN, 'Le format de la clé du rôle est invalide.'],
        },
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
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
                    match: [PERMISSION_PATTERN, 'Le format de la permission est invalide.'],
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
        isEditable: {
            type: Boolean,
            default: true,
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        /**
         * Un rôle personnalisé supprimé reste conservé pour préserver les
         * références historiques des memberships, invitations et AuditLogs.
         */
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

roleSchema.index(
    {
        workspace: 1,
        key: 1,
    },
    {
        unique: true,
    },
);

roleSchema.index({
    workspace: 1,
    isSystem: 1,
    deletedAt: 1,
});


const Role = model('Role', roleSchema);


export { Role };
