import { isIP } from 'node:net';

import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';


const { Schema, model } = mongoose;

const MAX_METADATA_SIZE_BYTES = 16 * 1024;

const FORBIDDEN_METADATA_KEY_PATTERN =
    /(password|passwd|token|secret|cookie|authorization|credential|apikey|sessionid)/i;

const IMMUTABLE_QUERY_OPERATIONS = [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
];


/**
 * Vérifie que metadata reste un objet simple.
 *
 * Les tableaux et les valeurs primitives compliqueraient les futurs filtres,
 * les contrôles de sécurité et la sérialisation des événements.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
    if (value === null || typeof value !== 'object') {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
}


/**
 * Recherche récursivement les noms de propriétés pouvant désigner un secret.
 *
 * Cette protection constitue une dernière barrière au niveau du modèle.
 * Le futur service AuditLog devra également construire des métadonnées
 * explicitement autorisées pour chaque action.
 *
 * @param {*} value
 * @param {WeakSet<object>} visited
 * @returns {boolean}
 */
function containsForbiddenMetadataKey(value, visited = new WeakSet()) {
    if (value === null || typeof value !== 'object') {
        return false;
    }

    if (visited.has(value)) {
        return false;
    }

    visited.add(value);

    for (const [key, nestedValue] of Object.entries(value)) {
        const normalizedKey = key.replace(/[^a-z0-9]/gi, '');

        if (FORBIDDEN_METADATA_KEY_PATTERN.test(normalizedKey)) {
            return true;
        }

        if (containsForbiddenMetadataKey(nestedValue, visited)) {
            return true;
        }
    }

    return false;
}


/**
 * Limite la taille sérialisée des métadonnées.
 *
 * Un journal d’audit doit contenir le contexte nécessaire à la traçabilité,
 * pas une copie complète de la requête, de la ressource ou du fichier.
 *
 * @param {*} value
 * @returns {boolean}
 */
function hasAllowedMetadataSize(value) {
    try {
        return Buffer.byteLength(JSON.stringify(value), 'utf8')
            <= MAX_METADATA_SIZE_BYTES;
    } catch {
        return false;
    }
}


const auditLogSchema = new Schema(
    {
        actor: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },

        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            default: null,
            immutable: true,
        },

        organization: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            default: null,
            immutable: true,
        },

        action: {
            type: String,
            required: true,
            enum: Object.values(AUDIT_ACTION),
            immutable: true,
        },

        entityType: {
            type: String,
            enum: Object.values(AUDIT_ENTITY_TYPE),
            default: null,
            immutable: true,
        },

        entityId: {
            type: Schema.Types.ObjectId,
            default: null,
            immutable: true,
        },

        status: {
            type: String,
            required: true,
            enum: Object.values(AUDIT_STATUS),
            immutable: true,
        },

        ipAddress: {
            type: String,
            default: null,
            maxlength: 64,
            trim: true,
            immutable: true,
            validate: {
                validator(value) {
                    return value === null || isIP(value) !== 0;
                },
                message: 'ipAddress doit contenir une adresse IP valide.',
            },
        },

        userAgent: {
            type: String,
            default: null,
            maxlength: 1024,
            trim: true,
            immutable: true,
        },

        metadata: {
            type: Schema.Types.Mixed,
            default: () => ({}),
            immutable: true,
            validate: [
                {
                    validator: isPlainObject,
                    message: 'metadata doit être un objet simple.',
                },
                {
                    validator(value) {
                        return !containsForbiddenMetadataKey(value);
                    },
                    message:
                        'metadata contient une propriété sensible interdite.',
                },
                {
                    validator: hasAllowedMetadataSize,
                    message:
                        'metadata dépasse la taille maximale autorisée.',
                },
            ],
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
        versionKey: false,
    },
);


/**
 * Une ressource auditée doit être identifiée complètement.
 *
 * Autoriser uniquement entityType ou uniquement entityId produirait des
 * événements impossibles à relier précisément à leur ressource.
 */
auditLogSchema.pre('validate', function validateEntityReference() {
    const hasEntityType = this.entityType !== null
        && this.entityType !== undefined;

    const hasEntityId = this.entityId !== null
        && this.entityId !== undefined;

    if (hasEntityType !== hasEntityId) {
        this.invalidate(
            'entityId',
            'entityType et entityId doivent être renseignés ensemble.',
        );
    }
});


/**
 * Un AuditLog décrit un événement passé : une sauvegarde ultérieure du même
 * document modifierait l'histoire au lieu d'ajouter un nouvel événement.
 */
auditLogSchema.pre('save', function preventExistingDocumentSave() {
    if (!this.isNew) {
        throw new Error(
            'Un journal d’audit existant ne peut pas être modifié.',
        );
    }
});


/**
 * Bloque les modifications et suppressions ordinaires passant par le modèle.
 *
 * Une éventuelle politique de rétention devra utiliser un processus technique
 * distinct, explicitement autorisé et lui-même supervisé.
 */
auditLogSchema.pre(
    IMMUTABLE_QUERY_OPERATIONS,
    function preventAuditLogMutation() {
        throw new Error(
            'Les journaux d’audit sont immuables et ne peuvent pas être modifiés ou supprimés.',
        );
    },
);


/*
 * Les index commencent par le principal critère de filtrage et terminent par
 * createdAt afin de servir directement les consultations chronologiques.
 */
auditLogSchema.index({ workspace: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index(
    { entityType: 1, entityId: 1, createdAt: -1 },
);
auditLogSchema.index({ createdAt: -1 });


const AuditLog = model('AuditLog', auditLogSchema);


export {
    AuditLog,
    MAX_METADATA_SIZE_BYTES,
};