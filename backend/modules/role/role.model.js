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
        /**
         * Workspace auquel appartient le rôle.
         *
         * Un rôle ne peut pas être partagé entre plusieurs workspaces ni être
         * transféré vers un autre tenant.
         */
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },

        /**
         * Identifiant métier stable du rôle.
         *
         * Le backend utilise notamment les clés des rôles système pour reconnaître
         * et protéger le rôle owner. La clé ne suit pas les changements du nom
         * affiché et ne peut pas être modifiée après la création.
         */
        key: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            lowercase: true,
            minlength: 2,
            maxlength: 64,
            match: [
                ROLE_KEY_PATTERN,
                'Le format de la clé du rôle est invalide.',
            ],
        },

        /**
         * Nom lisible présenté dans l’interface.
         *
         * Contrairement à la clé, ce nom peut être modifié lorsque la politique
         * du rôle l’autorise.
         */
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
        },

        /**
         * Description facultative de la fonction du rôle.
         */
        description: {
            type: String,
            default: null,
            trim: true,
            maxlength: 500,
        },

        /**
         * Actions autorisées pour les membres possédant ce rôle.
         *
         * Le schéma valide uniquement la structure segmentée de la permission.
         * Le service contrôle que chaque valeur appartient au registre actif des
         * permissions réellement chargé par le socle et l’application métier.
         */
        permissions: {
            type: [
                {
                    type: String,
                    trim: true,
                    lowercase: true,
                    match: [
                        PERMISSION_PATTERN,
                        'Le format de la permission est invalide.',
                    ],
                },
            ],
            default: [],
        },

        /**
         * Indique que le rôle a été installé par le socle applicatif.
         *
         * Cette qualification est définitive : un rôle personnalisé ne doit pas
         * pouvoir devenir artificiellement un rôle système.
         */
        isSystem: {
            type: Boolean,
            default: false,
            required: true,
            immutable: true,
        },

        /**
         * Indique si le rôle peut être modifié par l’administration du workspace.
         *
         * Ce champ ne constitue pas à lui seul une protection : le service devra
         * le contrôler avant tout changement du rôle.
         */
        isEditable: {
            type: Boolean,
            default: true,
            required: true,
        },

        /**
         * Utilisateur ayant créé le rôle.
         *
         * Pour les rôles système créés avec le workspace, il s’agira du créateur
         * du workspace. Ce champ sert uniquement à la traçabilité.
         */
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        /**
         * Utilisateur responsable de la dernière modification du rôle.
         */
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        /**
         * Un rôle personnalisé supprimé reste conservé afin de préserver les
         * références historiques des memberships, invitations et AuditLogs.
         */
        deletedAt: {
            type: Date,
            default: null,
        },

        /**
         * Acteur responsable de la suppression logique du rôle.
         */
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


/**
 * Une clé de rôle ne peut exister qu’une fois dans un même workspace.
 *
 * Deux workspaces peuvent néanmoins posséder chacun leur propre rôle `owner`,
 * `admin` ou tout autre rôle personnalisé portant la même clé.
 */
roleSchema.index(
    {
        workspace: 1,
        key: 1,
    },
    {
        unique: true,
    },
);

/**
 * Optimise la récupération des rôles système ou personnalisés actifs d’un
 * workspace sans exposer les rôles supprimés dans les listes courantes.
 */
roleSchema.index({
    workspace: 1,
    isSystem: 1,
    deletedAt: 1,
});


const Role = model('Role', roleSchema);


export { Role };
