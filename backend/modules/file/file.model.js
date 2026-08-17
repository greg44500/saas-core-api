import mongoose from 'mongoose';

import {
    ALLOWED_FILE_TYPES,
    FILE_CATEGORY,
    FILE_SCAN_STATUS,
    FILE_STATUS,
    FILE_STORAGE_PROVIDER,
} from '../../constants/file.constants.js';


const { Schema, model } = mongoose;


/**
 * Extensions réellement autorisées, dérivées du registre des types.
 *
 * Cette liste ne sert pas à détecter le type réel. Elle protège seulement
 * la cohérence des métadonnées enregistrées après cette détection.
 */
const ALLOWED_FILE_EXTENSIONS = Object.freeze(
    Object.values(ALLOWED_FILE_TYPES)
        .flatMap(({ extensions }) => extensions),
);


/**
 * Vérifie qu'une taille est exprimée par un nombre entier strictement positif.
 */
const isPositiveInteger = (value) =>
    Number.isInteger(value) && value > 0;


/**
 * Format attendu pour une empreinte SHA-256 en représentation hexadécimale.
 */
const SHA256_PATTERN = /^[a-f0-9]{64}$/;


/**
 * Métadonnées relatives à l'analyse antivirus.
 *
 * Le résultat reste indépendant du statut fonctionnel du fichier afin de
 * distinguer clairement la sécurité du cycle de vie métier.
 */
const malwareScanSchema = new Schema(
    {
        status: {
            type: String,
            enum: Object.values(FILE_SCAN_STATUS),
            default: FILE_SCAN_STATUS.PENDING,
            required: true,
        },

        /**
         * Identifiant technique du moteur ayant rendu le verdict.
         *
         * Il reste ouvert afin de permettre ClamAV aujourd'hui et un autre
         * fournisseur ultérieurement.
         */
        provider: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },

        scannedAt: {
            type: Date,
            default: null,
        },

        /**
         * Nom technique de la menace éventuellement détectée.
         *
         * Ce champ n'a pas vocation à être exposé dans les réponses publiques.
         */
        threatName: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
            select: false,
        },

        /**
         * Code technique assaini en cas d'échec du scanner.
         *
         * Il ne doit contenir ni stack trace, ni secret, ni message brut
         * provenant d'un fournisseur externe.
         */
        errorCode: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
            select: false,
        },
    },
    {
        _id: false,
    },
);


/**
 * Représente les métadonnées d'un fichier appartenant à un workspace.
 *
 * Le contenu binaire n'est jamais stocké dans MongoDB. Son emplacement est
 * identifié par storageProvider et storageKey.
 */
const fileSchema = new Schema(
    {
        /**
         * Frontière multi-tenant du fichier.
         *
         * Un fichier ne peut jamais être transféré silencieusement vers un
         * autre workspace.
         */
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },

        /**
         * Utilisateur ayant initialement téléversé le fichier.
         *
         * L'historique détaillé des actions appartiendra à AuditLog.
         */
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        /**
         * Nom fourni par l'utilisateur, conservé uniquement comme métadonnée.
         *
         * Ce nom ne doit jamais servir directement de nom de stockage.
         */
        originalName: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            minlength: 1,
            maxlength: 255,
        },

        /**
         * Nom généré par le backend après identification du type réel.
         */
        storedName: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            minlength: 1,
            maxlength: 255,
            match: [
                /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
                'Le nom de stockage du fichier est invalide.',
            ],
        },

        /**
         * Type MIME déterminé depuis le contenu du fichier.
         *
         * La valeur déclarée par le navigateur ne doit pas être enregistrée
         * ici sans vérification préalable.
         */
        mimeType: {
            type: String,
            enum: Object.values(ALLOWED_FILE_TYPES)
                .map(({ mimeType }) => mimeType),
            required: true,
            immutable: true,
        },

        /**
         * Extension canonique issue du type réellement détecté.
         */
        extension: {
            type: String,
            enum: ALLOWED_FILE_EXTENSIONS,
            required: true,
            immutable: true,
            lowercase: true,
        },

        /**
         * Taille exacte du contenu binaire, exprimée en octets.
         */
        sizeBytes: {
            type: Number,
            required: true,
            immutable: true,
            validate: {
                validator: isPositiveInteger,
                message:
                    'La taille du fichier doit être un entier strictement positif.',
            },
        },

        /**
         * Fournisseur responsable du stockage physique.
         */
        storageProvider: {
            type: String,
            enum: Object.values(FILE_STORAGE_PROVIDER),
            required: true,
            immutable: true,
        },

        /**
         * Identifiant interne du contenu chez le fournisseur.
         *
         * Pour un stockage local, il s'agira d'un chemin relatif contrôlé.
         * Pour S3, il s'agira de la clé de l'objet, jamais d'une URL publique.
         */
        storageKey: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            minlength: 1,
            maxlength: 1024,
        },

        /**
         * Empreinte du contenu calculée par le backend.
         *
         * Elle permettra de contrôler l'intégrité et pourra aider à identifier
         * des contenus strictement identiques sans imposer leur déduplication.
         */
        checksumSha256: {
            type: String,
            required: true,
            immutable: true,
            lowercase: true,
            match: [
                SHA256_PATTERN,
                "L'empreinte SHA-256 du fichier est invalide.",
            ],
        },

        /**
         * Usage générique du fichier dans l'application.
         *
         * Une future base de connaissances référencera File depuis son propre
         * modèle au lieu d'ajouter ses règles métier dans ce champ.
         */
        category: {
            type: String,
            enum: Object.values(FILE_CATEGORY),
            default: FILE_CATEGORY.OTHER,
            required: true,
        },

        /**
         * État fonctionnel actuel du fichier.
         */
        status: {
            type: String,
            enum: Object.values(FILE_STATUS),
            default: FILE_STATUS.QUARANTINED,
            required: true,
        },

        malwareScan: {
            type: malwareScanSchema,
            default: () => ({
                status: FILE_SCAN_STATUS.PENDING,
            }),
            required: true,
        },

        /**
         * Date de la suppression logique demandée.
         */
        deletedAt: {
            type: Date,
            default: null,
        },

        /**
         * Utilisateur ayant demandé la suppression logique.
         *
         * null reste possible pour une opération technique ou système.
         */
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        /**
         * Date à partir de laquelle la purge physique devient possible.
         *
         * Le service la calculera à partir de FILE_RETENTION_DAYS.
         */
        purgeScheduledAt: {
            type: Date,
            default: null,
        },

        /**
         * Date effective de suppression du contenu physique.
         */
        purgedAt: {
            type: Date,
            default: null,
        },

        /**
         * Dernier utilisateur ayant modifié l'état du fichier.
         *
         * null représente une opération automatique, comme une analyse
         * antivirus ou une purge exécutée par un job.
         */
        updatedBy: {
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
 * Protège les principales transitions incohérentes.
 *
 * Les services resteront responsables des transitions métier. Cette validation
 * constitue une seconde barrière contre l'enregistrement d'un état dangereux.
 */
fileSchema.pre('validate', function validateFileConsistency() {
    const scanStatus = this.malwareScan?.status;

    if (
        this.status === FILE_STATUS.ACTIVE
        && scanStatus !== FILE_SCAN_STATUS.CLEAN
    ) {
        this.invalidate(
            'status',
            "Un fichier ne peut pas devenir actif avant une analyse antivirus réussie.",
        );
    }

    if (
        [
            FILE_SCAN_STATUS.CLEAN,
            FILE_SCAN_STATUS.INFECTED,
        ].includes(scanStatus)
        && (
            !this.malwareScan.provider
            || !(this.malwareScan.scannedAt instanceof Date)
        )
    ) {
        this.invalidate(
            'malwareScan',
            "Un verdict antivirus définitif doit identifier le scanner et la date d'analyse.",
        );
    }

    if (
        scanStatus === FILE_SCAN_STATUS.INFECTED
        && this.status !== FILE_STATUS.REJECTED
    ) {
        this.invalidate(
            'status',
            'Un fichier infecté doit être rejeté.',
        );
    }

    const isDeletedOrPurged = [
        FILE_STATUS.DELETED,
        FILE_STATUS.PURGED,
    ].includes(this.status);

    if (isDeletedOrPurged) {
        if (!(this.deletedAt instanceof Date)) {
            this.invalidate(
                'deletedAt',
                'Un fichier supprimé doit posséder une date de suppression.',
            );
        }

        if (
            !(this.purgeScheduledAt instanceof Date)
            || (
                this.deletedAt instanceof Date
                && this.purgeScheduledAt <= this.deletedAt
            )
        ) {
            this.invalidate(
                'purgeScheduledAt',
                'La date de purge doit être postérieure à la suppression.',
            );
        }
    } else if (
        this.deletedAt !== null
        || this.deletedBy !== null
        || this.purgeScheduledAt !== null
        || this.purgedAt !== null
    ) {
        this.invalidate(
            'status',
            'Les informations de suppression sont incompatibles avec le statut du fichier.',
        );
    }

    if (
        this.status === FILE_STATUS.PURGED
        && (
            !(this.purgedAt instanceof Date)
            || (
                this.purgeScheduledAt instanceof Date
                && this.purgedAt < this.purgeScheduledAt
            )
        )
    ) {
        this.invalidate(
            'purgedAt',
            'La purge physique ne peut pas précéder la date de purge planifiée.',
        );
    }
});


/**
 * Garantit qu'une même clé physique n'est enregistrée qu'une seule fois
 * pour un fournisseur donné.
 */
fileSchema.index(
    {
        storageProvider: 1,
        storageKey: 1,
    },
    {
        unique: true,
        name: 'unique_storage_provider_key',
    },
);


/**
 * Index principal pour lister les fichiers visibles d'un workspace.
 */
fileSchema.index({
    workspace: 1,
    status: 1,
    createdAt: -1,
});


/**
 * Index utilisé par le futur job chargé des purges physiques.
 */
fileSchema.index(
    {
        purgeScheduledAt: 1,
    },
    {
        name: 'files_pending_purge',
        partialFilterExpression: {
            status: FILE_STATUS.DELETED,
        },
    },
);


const File = model('File', fileSchema);


export { File };