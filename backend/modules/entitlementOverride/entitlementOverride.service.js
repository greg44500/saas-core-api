import mongoose from 'mongoose';

import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';
import {
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../constants/entitlementOverride.constants.js';
import { EntitlementOverride } from './entitlementOverride.model.js';


const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

const toIdString = (value) =>
    value?.toString?.() ?? String(value);

/**
 * Vérifie qu'un override persisté reste compatible avec le registre de
 * capabilities actuellement chargé.
 *
 * Le modèle garantit la forme syntaxique des clés. Le registre reste en
 * revanche l'autorité fonctionnelle : une ancienne donnée devenue inconnue
 * ne doit jamais accorder silencieusement un droit commercial.
 */
const assertRegisteredOverride = (override, registry) => {
    if (override.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
        if (!registry.features.has(override.featureKey)) {
            throw new TypeError(
                `Unknown entitlement override feature: "${override.featureKey}"`,
            );
        }

        return;
    }

    if (override.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT) {
        if (!registry.metrics.has(override.metricKey)) {
            throw new TypeError(
                `Unknown entitlement override metric: "${override.metricKey}"`,
            );
        }

        return;
    }

    throw new TypeError(
        `Unknown entitlement override target type: "${override.targetType}"`,
    );
};

/**
 * Normalise un document lean en DTO interne stable pour les prochaines étapes
 * du moteur d'entitlement.
 */
const normalizeActiveOverride = (override) => ({
    id: toIdString(override._id),
    targetType: override.targetType,
    featureKey: override.featureKey ?? null,
    metricKey: override.metricKey ?? null,
    featureEnabled: override.featureEnabled ?? null,
    limitValue: override.limitValue ?? null,
    source: override.source,
    startsAt: override.startsAt,
    endsAt: override.endsAt ?? null,
    reason: override.reason,
    grantedBy: toIdString(override.grantedBy),
    updatedBy: override.updatedBy
        ? toIdString(override.updatedBy)
        : null,
    createdAt: override.createdAt,
    updatedAt: override.updatedAt,
});

const getOverrideCapabilityKey = (override) =>
    override.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
        ? `feature:${override.featureKey}`
        : `limit:${override.metricKey}`;

/**
 * Trie du plus récent au plus ancien afin de rendre le chevauchement de
 * périodes déterministe. Le premier override rencontré pour une capability
 * devient donc l'override effectif à l'instant demandé.
 */
const compareOverridePrecedence = (left, right) => {
    const startsAtDiff =
        right.startsAt.getTime() - left.startsAt.getTime();

    if (startsAtDiff !== 0) {
        return startsAtDiff;
    }

    const createdAtDiff =
        right.createdAt.getTime() - left.createdAt.getTime();

    if (createdAtDiff !== 0) {
        return createdAtDiff;
    }

    return right._id.toString().localeCompare(left._id.toString());
};

/**
 * Résout les EntitlementOverride actifs d'un Workspace à un instant donné.
 *
 * Un override est actif lorsque :
 * - il n'est pas révoqué ;
 * - startsAt <= at ;
 * - endsAt est null ou endsAt > at.
 *
 * La borne de fin est volontairement exclusive : à `endsAt`, l'exception
 * n'est plus effective.
 *
 * Si plusieurs overrides actifs ciblent la même capability, le plus récemment
 * démarré prévaut. En cas d'égalité, le plus récemment créé prévaut.
 *
 * Le registre par défaut est le registre actif de l'application. Une feature
 * métier déclarée après clonage devient donc disponible sans modifier ce
 * service Core.
 */
const resolveActiveEntitlementOverrides = async ({
    workspaceId,
    at = new Date(),
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to resolve entitlement overrides',
        );
    }

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    if (
        !registry
        || !(registry.features instanceof Set)
        || !(registry.metrics instanceof Set)
    ) {
        throw new TypeError(
            'registry must expose features and metrics sets',
        );
    }

    const baseFilter = {
        workspace: workspaceId,
        revokedAt: null,
        startsAt: mongoose.trusted({
            $lte: at,
        }),
    };

    const projection = [
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
        'createdAt',
        'updatedAt',
    ].join(' ');

    const buildQuery = (endsAtFilter) => {
        let query = EntitlementOverride.find({
            ...baseFilter,
            endsAt: endsAtFilter,
        })
            .select(projection)
            .lean();

        if (session) {
            query = query.session(session);
        }

        return query;
    };

    const boundedEndsAtFilter = mongoose.trusted({
        $gt: at,
    });

    let permanentOverrides;
    let boundedOverrides;

    /*
     * Hors transaction, les deux lectures indépendantes peuvent être lancées
     * en parallèle. Avec une session, elles restent séquentielles : les appels
     * au resolver peuvent participer à une transaction plus large et ne doivent
     * pas introduire d'opérations concurrentes sur cette même session.
     *
     * Les opérateurs MongoDB sont entièrement construits par le backend et
     * restent explicitement trusted afin de conserver sanitizeFilter global.
     */
    if (session) {
        permanentOverrides = await buildQuery(null);
        boundedOverrides = await buildQuery(boundedEndsAtFilter);
    } else {
        [
            permanentOverrides,
            boundedOverrides,
        ] = await Promise.all([
            buildQuery(null),
            buildQuery(boundedEndsAtFilter),
        ]);
    }

    const candidates = [
        ...permanentOverrides,
        ...boundedOverrides,
    ];

    for (const override of candidates) {
        assertRegisteredOverride(override, registry);
    }

    const effectiveByCapability = new Map();

    [...candidates]
        .sort(compareOverridePrecedence)
        .forEach((override) => {
            const capabilityKey = getOverrideCapabilityKey(override);

            if (!effectiveByCapability.has(capabilityKey)) {
                effectiveByCapability.set(capabilityKey, override);
            }
        });

    const effectiveOverrides = [...effectiveByCapability.values()]
        .map(normalizeActiveOverride);

    const features = {};
    const limits = {};

    for (const override of effectiveOverrides) {
        if (override.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
            features[override.featureKey] = override.featureEnabled;
        } else {
            limits[override.metricKey] = override.limitValue;
        }
    }

    return {
        at,
        features,
        limits,
        overrides: effectiveOverrides,
    };
};


export {
    resolveActiveEntitlementOverrides,
};
