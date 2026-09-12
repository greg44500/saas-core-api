import mongoose from 'mongoose';

import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
    getPlanFeatureMetricKeys,
} from '../../../config/applicationCapability.registry.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
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


const assertObjectId = (value, fieldName) => {
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        throw new TypeError(`${fieldName} must be a valid ObjectId`);
    }
};

const assertValidDate = (value, fieldName) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new TypeError(`${fieldName} must be a valid Date`);
    }
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

const assertRelatedLimits = ({ featureKey, relatedLimits = [] }) => {
    const allowedMetrics = new Set(getPlanFeatureMetricKeys(featureKey));
    const seen = new Set();

    for (const limit of relatedLimits) {
        if (!ACTIVE_PLAN_CAPABILITY_REGISTRY.metrics.has(limit.metricKey)) {
            throw new AppError(
                'Métrique inconnue du registre de capabilities.',
                400,
            );
        }

        if (!allowedMetrics.has(limit.metricKey)) {
            throw new AppError(
                'Une limite fournie n’est pas associée à cette fonctionnalité.',
                400,
            );
        }

        if (seen.has(limit.metricKey)) {
            throw new AppError(
                'Une métrique ne peut être configurée qu’une seule fois.',
                400,
            );
        }

        seen.add(limit.metricKey);
    }
};

const populateOverrideQuery = (query) => query
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
    groupId: override.groupId?.toString?.() ?? null,
    groupName: override.groupName ?? null,
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

const auditCreatedOverride = async ({
    override,
    actorId,
    ipAddress,
    userAgent,
    session,
}) => createAuditLog(
    {
        actor: actorId,
        workspace: override.workspace,
        action: AUDIT_ACTION.ENTITLEMENT_OVERRIDE_CREATED,
        entityType: AUDIT_ENTITY_TYPE.ENTITLEMENT_OVERRIDE,
        entityId: override._id,
        status: AUDIT_STATUS.SUCCESS,
        ipAddress,
        userAgent,
        metadata: snapshotOverride(override),
    },
    { session },
);

const auditUpdatedOverride = async ({
    override,
    actorId,
    previous,
    ipAddress,
    userAgent,
    session,
}) => createAuditLog(
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
            current: snapshotOverride(override),
        },
    },
    { session },
);

const auditRevokedOverride = async ({
    override,
    actorId,
    ipAddress,
    userAgent,
    session,
}) => createAuditLog(
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
            groupId: override.groupId?.toString?.() ?? null,
            targetType: override.targetType,
            featureKey: override.featureKey ?? null,
            metricKey: override.metricKey ?? null,
            revokedAt: override.revokedAt,
            reason: override.revokeReason,
        },
    },
    { session },
);

const serializeGroup = ({ primary, relatedOverrides, at }) => ({
    groupId: primary.groupId?.toString?.() ?? null,
    groupName: primary.groupName ?? null,
    featureKey: primary.featureKey,
    primaryOverride: serializePlatformEntitlementOverride({
        override: primary,
        at,
    }),
    relatedOverrides: relatedOverrides.map((override) =>
        serializePlatformEntitlementOverride({
            override,
            at,
        })),
});

/**
 * Crée en une transaction la feature et les limites que l'administrateur a
 * explicitement choisi d'associer à la même décision commerciale.
 */
const createPlatformFeatureOverrideGroup = async ({
    groupData,
    actorId,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    if (!groupData) {
        throw new TypeError('groupData is required');
    }

    assertObjectId(actorId, 'actorId');
    assertObjectId(groupData.workspaceId, 'workspaceId');
    assertValidDate(now, 'now');

    if (!ACTIVE_PLAN_CAPABILITY_REGISTRY.features.has(groupData.featureKey)) {
        throw new AppError(
            'Feature inconnue du registre de capabilities.',
            400,
        );
    }

    assertRelatedLimits({
        featureKey: groupData.featureKey,
        relatedLimits: groupData.relatedLimits,
    });

    let primaryOverride;
    let relatedOverrides = [];

    await mongoose.connection.transaction(async (session) => {
        const workspace = await Workspace.findById(groupData.workspaceId)
            .select('_id')
            .session(session);

        if (!workspace) {
            throw new AppError('Workspace introuvable.', 404);
        }

        const groupId = new mongoose.Types.ObjectId();
        const commonData = {
            workspace: workspace._id,
            groupId,
            groupName: groupData.groupName,
            source: groupData.source,
            startsAt: groupData.startsAt ?? now,
            endsAt: groupData.endsAt ?? null,
            reason: groupData.reason,
            grantedBy: actorId,
            updatedBy: null,
        };

        const documents = [
            {
                ...commonData,
                targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
                featureKey: groupData.featureKey,
                metricKey: null,
                featureEnabled: true,
                limitValue: null,
            },
            ...(groupData.relatedLimits ?? []).map((limit) => ({
                ...commonData,
                targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
                featureKey: null,
                metricKey: limit.metricKey,
                featureEnabled: null,
                limitValue: limit.limitValue,
            })),
        ];

        // Mongoose 9 exige explicitement ordered=true lorsqu'une création de
        // plusieurs documents est rattachée à une session transactionnelle.
        const createdOverrides = await EntitlementOverride.create(
            documents,
            { session, ordered: true },
        );

        [primaryOverride, ...relatedOverrides] = createdOverrides;

        for (const override of createdOverrides) {
            await auditCreatedOverride({
                override,
                actorId,
                ipAddress,
                userAgent,
                session,
            });
        }
    });

    return serializeGroup({
        primary: primaryOverride,
        relatedOverrides,
        at: now,
    });
};

const getPlatformFeatureOverrideGroup = async ({
    overrideId,
    at = new Date(),
}) => {
    assertObjectId(overrideId, 'overrideId');
    assertValidDate(at, 'at');

    const primary = await populateOverrideQuery(
        EntitlementOverride.findById(overrideId),
    ).lean();

    if (!primary) {
        throw new AppError('Dérogation introuvable.', 404);
    }

    if (primary.targetType !== ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
        throw new AppError(
            'Cette dérogation ne cible pas une fonctionnalité.',
            409,
        );
    }

    if (!primary.groupId) {
        return serializeGroup({
            primary,
            relatedOverrides: [],
            at,
        });
    }

    const relatedOverrides = await populateOverrideQuery(
        EntitlementOverride.find({
            groupId: primary.groupId,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
        }),
    )
        .sort({ metricKey: 1, _id: 1 })
        .lean();

    return serializeGroup({
        primary,
        relatedOverrides,
        at,
    });
};

/**
 * Modifie la décision groupée comme une unité UX tout en conservant des
 * overrides atomiques. Chaque override existant est sauvegardé et audité une
 * seule fois, même si plusieurs propriétés changent dans la même opération.
 *
 * `relatedLimits` est volontairement un patch partiel : les métriques fournies
 * sont mises à jour ou créées et les métriques omises restent inchangées. Une
 * omission ne doit jamais supprimer ou révoquer implicitement un droit existant.
 */
const updatePlatformFeatureOverrideGroup = async ({
    overrideId,
    groupData,
    actorId,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    assertObjectId(overrideId, 'overrideId');
    assertObjectId(actorId, 'actorId');
    assertValidDate(now, 'now');

    if (!groupData || Object.keys(groupData).length === 0) {
        throw new TypeError('groupData is required');
    }

    let primaryOverride;
    let relatedOverrides = [];

    await mongoose.connection.transaction(async (session) => {
        const primary = await EntitlementOverride.findById(
            overrideId,
        ).session(session);

        if (!primary) {
            throw new AppError('Dérogation introuvable.', 404);
        }

        if (primary.targetType !== ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
            throw new AppError(
                'Cette dérogation ne cible pas une fonctionnalité.',
                409,
            );
        }

        if (!primary.groupId) {
            throw new AppError(
                'Cette ancienne dérogation n’appartient pas à un groupe modifiable.',
                409,
            );
        }

        assertMutableOverride({ override: primary, now });
        assertRelatedLimits({
            featureKey: primary.featureKey,
            relatedLimits: groupData.relatedLimits ?? [],
        });

        const related = await EntitlementOverride.find({
            groupId: primary.groupId,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
        }).session(session);

        for (const override of related) {
            assertMutableOverride({ override, now });
        }

        const existingDocuments = [primary, ...related];
        const previousById = new Map(
            existingDocuments.map((override) => [
                override._id.toString(),
                snapshotOverride(override),
            ]),
        );
        const commonUpdates = [
            'groupName',
            'source',
            'startsAt',
            'endsAt',
            'reason',
        ];

        for (const override of existingDocuments) {
            for (const field of commonUpdates) {
                if (Object.hasOwn(groupData, field)) {
                    override[field] = groupData[field];
                }
            }
            override.updatedBy = actorId;
        }

        if (Object.hasOwn(groupData, 'featureEnabled')) {
            primary.featureEnabled = groupData.featureEnabled;
        }

        const relatedByMetric = new Map(
            related.map((override) => [override.metricKey, override]),
        );

        for (const limit of groupData.relatedLimits ?? []) {
            const existing = relatedByMetric.get(limit.metricKey);

            if (existing) {
                existing.limitValue = limit.limitValue;
                existing.updatedBy = actorId;
                continue;
            }

            const [createdLimit] = await EntitlementOverride.create(
                [
                    {
                        workspace: primary.workspace,
                        groupId: primary.groupId,
                        groupName: primary.groupName,
                        targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
                        featureKey: null,
                        metricKey: limit.metricKey,
                        featureEnabled: null,
                        limitValue: limit.limitValue,
                        source: primary.source,
                        startsAt: primary.startsAt,
                        endsAt: primary.endsAt,
                        reason: primary.reason,
                        grantedBy: actorId,
                        updatedBy: null,
                    },
                ],
                { session, ordered: true },
            );

            related.push(createdLimit);
            relatedByMetric.set(limit.metricKey, createdLimit);

            await auditCreatedOverride({
                override: createdLimit,
                actorId,
                ipAddress,
                userAgent,
                session,
            });
        }

        for (const override of existingDocuments) {
            await override.save({ session });
            await auditUpdatedOverride({
                override,
                actorId,
                previous: previousById.get(override._id.toString()),
                ipAddress,
                userAgent,
                session,
            });
        }

        primaryOverride = primary;
        relatedOverrides = related;
    });

    return serializeGroup({
        primary: primaryOverride,
        relatedOverrides,
        at: now,
    });
};

/**
 * Révoque une décision commerciale groupée comme une seule unité métier.
 * La feature primaire, toutes ses limites enfants et leurs AuditLogs sont
 * persistés dans la même transaction : aucun enfant ne peut rester actif après
 * une révocation groupée réussie.
 */
const revokePlatformFeatureOverrideGroup = async ({
    overrideId,
    reason,
    actorId,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    assertObjectId(overrideId, 'overrideId');
    assertObjectId(actorId, 'actorId');
    assertValidDate(now, 'now');

    if (typeof reason !== 'string' || reason.trim().length < 3) {
        throw new TypeError('reason is required to revoke an entitlement override group');
    }

    let primaryOverride;
    let relatedOverrides = [];

    await mongoose.connection.transaction(async (session) => {
        const primary = await EntitlementOverride.findById(
            overrideId,
        ).session(session);

        if (!primary) {
            throw new AppError('Dérogation introuvable.', 404);
        }

        if (primary.targetType !== ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
            throw new AppError(
                'Cette dérogation ne cible pas une fonctionnalité.',
                409,
            );
        }

        if (!primary.groupId) {
            throw new AppError(
                'Cette dérogation n’appartient pas à un groupe révocable.',
                409,
            );
        }

        const related = await EntitlementOverride.find({
            groupId: primary.groupId,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
        }).session(session);
        const groupOverrides = [primary, ...related];

        for (const override of groupOverrides) {
            assertMutableOverride({ override, now });
        }

        const revokeReason = reason.trim();

        for (const override of groupOverrides) {
            override.revokedAt = now;
            override.revokedBy = actorId;
            override.revokeReason = revokeReason;
            override.updatedBy = actorId;
            await override.save({ session });
            await auditRevokedOverride({
                override,
                actorId,
                ipAddress,
                userAgent,
                session,
            });
        }

        primaryOverride = primary;
        relatedOverrides = related;
    });

    return serializeGroup({
        primary: primaryOverride,
        relatedOverrides,
        at: now,
    });
};


export {
    createPlatformFeatureOverrideGroup,
    getPlatformFeatureOverrideGroup,
    revokePlatformFeatureOverrideGroup,
    updatePlatformFeatureOverrideGroup,
};
