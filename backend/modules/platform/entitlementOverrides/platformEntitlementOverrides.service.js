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
 * Liste paginée destinée exclusivement à Platform.
 *
 * Les filtres restent simples et indexables. L'état temporel n'est pas stocké
 * ni filtré ici : il est dérivé dans le DTO afin d'éviter un statut persistant
 * qui pourrait se désynchroniser à l'expiration d'une période.
 */
const listPlatformEntitlementOverrides = async ({
    page = 1,
    limit = 20,
    workspaceId = null,
    targetType = null,
    source = null,
    at = new Date(),
}) => {
    assertPagination({ page, limit });

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    if (
        targetType !== null
        && !Object.values(ENTITLEMENT_OVERRIDE_TARGET).includes(targetType)
    ) {
        throw new TypeError('targetType must be a supported override target');
    }

    if (
        source !== null
        && !Object.values(ENTITLEMENT_OVERRIDE_SOURCE).includes(source)
    ) {
        throw new TypeError('source must be a supported override source');
    }

    const filter = {};

    if (workspaceId !== null) {
        assertObjectId(workspaceId, 'workspaceId');
        filter.workspace = workspaceId;
    }

    if (targetType !== null) {
        filter.targetType = targetType;
    }

    if (source !== null) {
        filter.source = source;
    }

    const skip = (page - 1) * limit;

    const query = populatePlatformOverrideQuery(
        EntitlementOverride.find(filter)
            .select(OVERRIDE_READ_PROJECTION),
    )
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const [documents, total] = await Promise.all([
        query,
        EntitlementOverride.countDocuments(filter),
    ]);

    return {
        overrides: documents.map((override) =>
            serializePlatformEntitlementOverride({
                override,
                at,
            })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
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

/**
 * Crée une exception commerciale sans modifier le Plan catalogue.
 *
 * Les chevauchements temporels ne sont volontairement pas rejetés ici : le
 * resolver Core possède une priorité déterministe. Garantir l'absence absolue
 * d'overlap concurrent nécessiterait une sérialisation dédiée qui dépasse la
 * V1 et ne doit pas être simulée par un simple check-then-insert fragile.
 */
const createPlatformEntitlementOverride = async ({
    overrideData,
    actorId,
    now = new Date(),
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!overrideData) {
        throw new TypeError('overrideData is required to create an entitlement override');
    }

    assertObjectId(actorId, 'actorId');
    assertObjectId(overrideData.workspaceId, 'workspaceId');
    assertRegisteredOverrideCapability({
        overrideData,
        registry,
    });

    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    let createdOverride;

    await mongoose.connection.transaction(async (session) => {
        const workspace = await Workspace.findById(
            overrideData.workspaceId,
        )
            .select('_id')
            .session(session);

        if (!workspace) {
            throw new AppError('Workspace introuvable.', 404);
        }

        const documentData = {
            workspace: workspace._id,
            targetType: overrideData.targetType,
            featureKey: overrideData.featureKey ?? null,
            metricKey: overrideData.metricKey ?? null,
            featureEnabled: overrideData.featureEnabled ?? null,
            limitValue: overrideData.limitValue ?? null,
            source: overrideData.source,
            startsAt: overrideData.startsAt ?? now,
            endsAt: overrideData.endsAt ?? null,
            reason: overrideData.reason,
            grantedBy: actorId,
            updatedBy: null,
        };

        [createdOverride] = await EntitlementOverride.create(
            [documentData],
            { session },
        );

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspace._id,
                action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_CREATED,
                entityType: AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
                entityId: createdOverride._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: snapshotOverride(createdOverride),
            },
            { session },
        );
    });

    return getPlatformEntitlementOverrideById({
        overrideId: createdOverride._id,
        at: now,
    });
};

const assertMutableOverride = ({ override, now }) => {
    const lifecycle = resolveEntitlementOverrideLifecycle({
        override,
        at: now,
    });

    if (lifecycle === 'revoked') {
        throw new AppError(
            'Une dérogation révoquée ne peut plus être modifiée.',
            409,
        );
    }

    if (lifecycle === 'expired') {
        throw new AppError(
            'Une dérogation expirée est historique et ne peut plus être modifiée.',
            409,
        );
    }
};

const assertUpdateMatchesTarget = ({ override, overrideData }) => {
    if (
        override.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
        && Object.hasOwn(overrideData, 'limitValue')
    ) {
        throw new AppError(
            'Une dérogation de feature ne peut pas recevoir une limite.',
            409,
        );
    }

    if (
        override.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT
        && Object.hasOwn(overrideData, 'featureEnabled')
    ) {
        throw new AppError(
            'Une dérogation de limite ne peut pas recevoir un état de feature.',
            409,
        );
    }
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
        throw new TypeError('overrideData is required to update an entitlement override');
    }

    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    let updatedOverrideId;

    await mongoose.connection.transaction(async (session) => {
        const override = await EntitlementOverride.findById(
            overrideId,
        ).session(session);

        if (!override) {
            throw new AppError('Dérogation introuvable.', 404);
        }

        assertMutableOverride({ override, now });
        assertUpdateMatchesTarget({ override, overrideData });

        const previous = snapshotOverride(override);

        for (const field of [
            'featureEnabled',
            'limitValue',
            'source',
            'startsAt',
            'endsAt',
            'reason',
        ]) {
            if (Object.hasOwn(overrideData, field)) {
                override[field] = overrideData[field];
            }
        }

        override.updatedBy = actorId;
        await override.save({ session });
        updatedOverrideId = override._id;

        await createAuditLog(
            {
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
                    next: snapshotOverride(override),
                },
            },
            { session },
        );
    });

    return getPlatformEntitlementOverrideById({
        overrideId: updatedOverrideId,
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
        throw new TypeError('reason is required to revoke an entitlement override');
    }

    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    let revokedOverrideId;

    await mongoose.connection.transaction(async (session) => {
        const override = await EntitlementOverride.findById(
            overrideId,
        ).session(session);

        if (!override) {
            throw new AppError('Dérogation introuvable.', 404);
        }

        assertMutableOverride({ override, now });

        override.revokedAt = now;
        override.revokedBy = actorId;
        override.revokeReason = reason.trim();
        override.updatedBy = actorId;
        await override.save({ session });
        revokedOverrideId = override._id;

        await createAuditLog(
            {
                actor: actorId,
                workspace: override.workspace,
                action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_REVOKED,
                entityType: AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
                entityId: override._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    targetType: override.targetType,
                    featureKey: override.featureKey ?? null,
                    metricKey: override.metricKey ?? null,
                    revokedAt: now,
                    reason: override.revokeReason,
                },
            },
            { session },
        );
    });

    return getPlatformEntitlementOverrideById({
        overrideId: revokedOverrideId,
        at: now,
    });
};


export {
    createPlatformEntitlementOverride,
    getPlatformEntitlementOverrideById,
    listPlatformEntitlementOverrides,
    revokePlatformEntitlementOverride,
    updatePlatformEntitlementOverride,
};
