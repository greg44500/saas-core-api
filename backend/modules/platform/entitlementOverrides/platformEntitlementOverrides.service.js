import mongoose from 'mongoose';

import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../../config/applicationCapability.registry.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    ENTITLEMENT_OVERRIDE_LIFECYCLE,
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import { AppError } from '../../../utils/appError.js';
import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';
import {
    EntitlementOverride,
} from '../../entitlementOverride/entitlementOverride.model.js';
import { Workspace } from '../../workspace/workspace.model.js';
import {
    resolveEntitlementOverrideLifecycle,
    serializePlatformEntitlementOverride,
} from './platformEntitlementOverride.dto.js';


const OVERRIDE_READ_PROJECTION = [
    '_id',
    'workspace',
    'groupId',
    'groupName',
    'targetType',
    'featureKey',
    'metricKey',
    'featureEnabled',
    'limitValue',
    'source',
    'startsAt',
    'endsAt',
    'reason',
    'grantedBy',
    'updatedBy',
    'revokedAt',
    'revokedBy',
    'revokeReason',
    'createdAt',
    'updatedAt',
].join(' ');

const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

const assertObjectId = (value, fieldName) => {
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        throw new TypeError(`${fieldName} must be a valid ObjectId`);
    }
};

const assertPagination = ({ page, limit }) => {
    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError('page must be an integer greater than or equal to 1');
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new TypeError('limit must be an integer between 1 and 100');
    }
};

const assertRegistryContract = (registry) => {
    if (
        !registry
        || !(registry.features instanceof Set)
        || !(registry.metrics instanceof Set)
    ) {
        throw new TypeError(
            'registry must expose features and metrics sets',
        );
    }
};

/**
 * La validation HTTP est une première barrière, mais le service reste une
 * frontière métier réutilisable. Un appel interne ne doit donc jamais pouvoir
 * persister une capability que le logiciel courant ne sait pas appliquer.
 */
const assertRegisteredOverrideCapability = ({
    overrideData,
    registry,
}) => {
    assertRegistryContract(registry);

    if (overrideData.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
        if (!registry.features.has(overrideData.featureKey)) {
            throw new AppError(
                'Feature inconnue du registre de capabilities.',
                400,
            );
        }

        return;
    }

    if (overrideData.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT) {
        if (!registry.metrics.has(overrideData.metricKey)) {
            throw new AppError(
                'Métrique inconnue du registre de capabilities.',
                400,
            );
        }

        return;
    }

    throw new AppError(
        'Le type de dérogation est invalide.',
        400,
    );
};

const populatePlatformOverrideQuery = (query) => query
    .populate({
        path: 'workspace',
        select: '_id name',
    })
    .populate({
        path: 'grantedBy',
        select: '_id firstName lastName email',
    })
    .populate({
        path: 'updatedBy',
        select: '_id firstName lastName email',
    })
    .populate({
        path: 'revokedBy',
        select: '_id firstName lastName email',
    });

const snapshotOverride = (override) => ({
    targetType: override.targetType,
    featureKey: override.featureKey ?? null,
    metricKey: override.metricKey ?? null,
    featureEnabled: override.featureEnabled ?? null,
    limitValue: override.limitValue ?? null,
    source: override.source,
    startsAt: override.startsAt,
    endsAt: override.endsAt ?? null,
    reason: override.reason,
});

/**
 * Traduit un lifecycle dérivé en filtre MongoDB à l'instant demandé.
 *
 * Les opérateurs sont construits uniquement à partir de valeurs déjà validées
 * par le service. `mongoose.trusted()` permet donc de conserver la protection
 * globale `sanitizeFilter` pour les entrées non fiables sans neutraliser ces
 * sélecteurs temporels internes.
 *
 * Le statut n'est volontairement jamais stocké. Cette traduction permet de
 * paginer et compter correctement côté serveur sans introduire un état
 * persistant qui pourrait devenir faux lorsque le temps passe.
 */
const buildLifecycleFilter = ({ lifecycle, at }) => {
    if (lifecycle === null) return {};

    if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE) {
        return {
            revokedAt: null,
            startsAt: mongoose.trusted({ $lte: at }),
            $or: [
                { endsAt: null },
                { endsAt: mongoose.trusted({ $gt: at }) },
            ],
        };
    }

    if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.SCHEDULED) {
        return {
            revokedAt: null,
            startsAt: mongoose.trusted({ $gt: at }),
        };
    }

    if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED) {
        return {
            revokedAt: null,
            endsAt: mongoose.trusted({
                $ne: null,
                $lte: at,
            }),
        };
    }

    if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED) {
        return {
            revokedAt: mongoose.trusted({ $ne: null }),
        };
    }

    throw new TypeError('lifecycle is invalid');
};

const listPlatformEntitlementOverrides = async ({
    page = 1,
    limit = 20,
    workspaceId = null,
    targetType = null,
    source = null,
    lifecycle = null,
    at = new Date(),
}) => {
    assertPagination({ page, limit });

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    if (workspaceId !== null) {
        assertObjectId(workspaceId, 'workspaceId');
    }

    if (
        targetType !== null
        && !Object.values(ENTITLEMENT_OVERRIDE_TARGET).includes(targetType)
    ) {
        throw new TypeError('targetType is invalid');
    }

    if (
        source !== null
        && !Object.values(ENTITLEMENT_OVERRIDE_SOURCE).includes(source)
    ) {
        throw new TypeError('source is invalid');
    }

    if (
        lifecycle !== null
        && !Object.values(ENTITLEMENT_OVERRIDE_LIFECYCLE).includes(lifecycle)
    ) {
        throw new TypeError('lifecycle is invalid');
    }

    const filter = {
        ...(workspaceId !== null ? { workspace: workspaceId } : {}),
        ...(targetType !== null ? { targetType } : {}),
        ...(source !== null ? { source } : {}),
        ...buildLifecycleFilter({ lifecycle, at }),
    };
    const skip = (page - 1) * limit;

    const [overrides, total] = await Promise.all([
        populatePlatformOverrideQuery(
            EntitlementOverride.find(filter)
                .select(OVERRIDE_READ_PROJECTION)
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit),
        ).lean(),
        EntitlementOverride.countDocuments(filter),
    ]);

    return {
        overrides: overrides.map((override) =>
            serializePlatformEntitlementOverride({
                override,
                at,
            })),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getPlatformEntitlementOverrideById = async ({
    overrideId,
    at = new Date(),
}) => {
    assertObjectId(overrideId, 'overrideId');

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    const override = await populatePlatformOverrideQuery(
        EntitlementOverride.findById(overrideId)
            .select(OVERRIDE_READ_PROJECTION),
    ).lean();

    if (!override) {
        throw new AppError('Dérogation introuvable.', 404);
    }

    return serializePlatformEntitlementOverride({
        override,
        at,
    });
};

const createPlatformEntitlementOverride = async ({
    overrideData,
    actorId,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    if (!overrideData) {
        throw new TypeError('overrideData is required');
    }

    assertObjectId(actorId, 'actorId');
    assertObjectId(overrideData.workspaceId, 'workspaceId');

    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    assertRegisteredOverrideCapability({
        overrideData,
        registry,
    });

    const workspace = await Workspace.findById(overrideData.workspaceId)
        .select('_id')
        .lean();

    if (!workspace) {
        throw new AppError('Workspace introuvable.', 404);
    }

    const override = await EntitlementOverride.create({
        workspace: overrideData.workspaceId,
        targetType: overrideData.targetType,
        featureKey:
            overrideData.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
                ? overrideData.featureKey
                : null,
        metricKey:
            overrideData.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT
                ? overrideData.metricKey
                : null,
        featureEnabled:
            overrideData.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
                ? overrideData.featureEnabled
                : null,
        limitValue:
            overrideData.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT
                ? overrideData.limitValue
                : null,
        source: overrideData.source,
        startsAt: overrideData.startsAt ?? now,
        endsAt: overrideData.endsAt ?? null,
        reason: overrideData.reason,
        grantedBy: actorId,
        updatedBy: null,
    });

    await createAuditLog({
        actor: actorId,
        workspace: overrideData.workspaceId,
        action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_CREATED,
        entityType: AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
        entityId: override._id,
        status: AUDIT_STATUS.SUCCESS,
        ipAddress,
        userAgent,
        metadata: snapshotOverride(override),
    });

    return serializePlatformEntitlementOverride({
        override,
        at: now,
    });
};

const updatePlatformEntitlementOverride = async ({
    overrideId,
    overrideData,
    actorId,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    assertObjectId(overrideId, 'overrideId');
    assertObjectId(actorId, 'actorId');

    if (!overrideData || Object.keys(overrideData).length === 0) {
        throw new TypeError('overrideData is required');
    }

    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    const override = await EntitlementOverride.findById(overrideId);

    if (!override) {
        throw new AppError('Dérogation introuvable.', 404);
    }

    const lifecycle = resolveEntitlementOverrideLifecycle({
        override,
        at: now,
    });

    if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED) {
        throw new AppError(
            'Une dérogation révoquée ne peut plus être modifiée.',
            409,
        );
    }

    if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED) {
        throw new AppError(
            'Une dérogation expirée est historique et ne peut plus être modifiée.',
            409,
        );
    }

    const previous = snapshotOverride(override);
    const mutableFields = [
        'featureEnabled',
        'limitValue',
        'source',
        'startsAt',
        'endsAt',
        'reason',
    ];

    for (const field of mutableFields) {
        if (Object.hasOwn(overrideData, field)) {
            override[field] = overrideData[field];
        }
    }

    override.updatedBy = actorId;
    await override.save();

    await createAuditLog({
        actor: actorId,
        workspace: override.workspace,
        action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_UPDATED,
        entityType: AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
        entityId: override._id,
        status: AUDIT_STATUS.SUCCESS,
        ipAddress,
        userAgent,
        metadata: {
            previous,
            current: snapshotOverride(override),
        },
    });

    return serializePlatformEntitlementOverride({
        override,
        at: now,
    });
};

const revokePlatformEntitlementOverride = async ({
    overrideId,
    reason,
    actorId,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    assertObjectId(overrideId, 'overrideId');
    assertObjectId(actorId, 'actorId');

    if (typeof reason !== 'string' || reason.trim().length < 3) {
        throw new TypeError('reason is required');
    }

    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    const override = await EntitlementOverride.findById(overrideId);

    if (!override) {
        throw new AppError('Dérogation introuvable.', 404);
    }

    const lifecycle = resolveEntitlementOverrideLifecycle({
        override,
        at: now,
    });

    if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED) {
        throw new AppError('Cette dérogation est déjà révoquée.', 409);
    }

    if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED) {
        throw new AppError(
            'Une dérogation expirée est déjà historique.',
            409,
        );
    }

    override.revokedAt = now;
    override.revokedBy = actorId;
    override.revokeReason = reason.trim();
    override.updatedBy = actorId;
    await override.save();

    await createAuditLog({
        actor: actorId,
        workspace: override.workspace,
        action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_REVOKED,
        entityType: AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
        entityId: override._id,
        status: AUDIT_STATUS.SUCCESS,
        ipAddress,
        userAgent,
        metadata: {
            revokeReason: override.revokeReason,
            revokedAt: override.revokedAt,
        },
    });

    return serializePlatformEntitlementOverride({
        override,
        at: now,
    });
};


export {
    assertRegisteredOverrideCapability,
    buildLifecycleFilter,
    createPlatformEntitlementOverride,
    getPlatformEntitlementOverrideById,
    listPlatformEntitlementOverrides,
    revokePlatformEntitlementOverride,
    updatePlatformEntitlementOverride,
};
