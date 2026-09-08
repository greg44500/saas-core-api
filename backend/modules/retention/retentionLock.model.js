import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const RETENTION_TARGET_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const RETENTION_LEASE_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Verrou distribué persistant d'une target de rétention.
 *
 * Un seul document existe par target. Il n'est jamais supprimé : une release
 * remet les champs de lease à null, ce qui garde une clé stable et évite de
 * transformer les suppressions/recréations concurrentes en primitive de lock.
 */
const retentionLockSchema = new Schema(
    {
        targetKey: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            lowercase: true,
            match: [
                RETENTION_TARGET_KEY_PATTERN,
                'Le format de targetKey du lock de rétention est invalide.',
            ],
        },
        leaseId: {
            type: String,
            default: null,
            trim: true,
            match: [
                RETENTION_LEASE_ID_PATTERN,
                "L'identifiant de lease de rétention est invalide.",
            ],
        },
        holderId: {
            type: String,
            default: null,
            trim: true,
            maxlength: 200,
        },
        acquiredAt: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        strict: 'throw',
    },
);

retentionLockSchema.pre('validate', function validateLeaseConsistency() {
    const values = [
        this.leaseId,
        this.holderId,
        this.acquiredAt,
        this.expiresAt,
    ];
    const populated = values.filter((value) => value !== null).length;

    if (populated !== 0 && populated !== values.length) {
        this.invalidate(
            'leaseId',
            'Une lease de rétention doit être entièrement renseignée ou entièrement libérée.',
        );
        return;
    }

    if (
        this.acquiredAt instanceof Date
        && this.expiresAt instanceof Date
        && this.expiresAt <= this.acquiredAt
    ) {
        this.invalidate(
            'expiresAt',
            "La lease de rétention doit expirer après son acquisition.",
        );
    }
});

retentionLockSchema.index(
    { targetKey: 1 },
    {
        unique: true,
        name: 'unique_retention_lock_target',
    },
);
retentionLockSchema.index(
    { expiresAt: 1 },
    { name: 'retention_lock_expiry' },
);

const RetentionLock = model(
    'RetentionLock',
    retentionLockSchema,
);

export { RetentionLock };
