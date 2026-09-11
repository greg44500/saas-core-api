import mongoose from 'mongoose';

import {
    getPlanFeatureOverridePolicy,
    isLimitValueAllowedByOverridePolicy,
} from '../../../config/entitlementOverridePolicy.registry.js';
import {
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import { AppError } from '../../../utils/appError.js';
import {
    EntitlementOverride,
} from '../../entitlementOverride/entitlementOverride.model.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../../subscriptions/subscription.service.js';


const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

const assertObjectId = (value, fieldName) => {
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        throw new TypeError(`${fieldName} must be a valid ObjectId`);
    }
};

const assertLimitValueWithinPolicy = ({ metricKey, limitValue }) => {
    if (!metricKey) {
        throw new TypeError('metricKey is required');
    }

    if (!isLimitValueAllowedByOverridePolicy({
        metricKey,
        limitValue,
    })) {
        throw new AppError(
            'La valeur demandée dépasse les garde-fous autorisés pour cette métrique.',
            400,
        );
    }
};

const resolveAssessmentDate = ({ startsAt, now }) => {
    if (isValidDate(startsAt) && startsAt > now) return startsAt;
    return now;
};

const assertFeatureOperationalLimits = async ({
    workspaceId,
    featureKey,
    relatedLimits = [],
    at,
}) => {
    const policy = getPlanFeatureOverridePolicy(featureKey);
    const requiredLimits = policy?.requiredLimits ?? {};
    const requiredEntries = Object.entries(requiredLimits);

    if (requiredEntries.length === 0) return;

    const entitlement = await getWorkspaceEffectiveEntitlement({
        workspaceId,
        at,
    });
    const explicitLimits = new Map(
        relatedLimits.map((limit) => [
            limit.metricKey,
            limit.limitValue,
        ]),
    );

    for (const [metricKey, requirement] of requiredEntries) {
        const projectedValue = explicitLimits.has(metricKey)
            ? explicitLimits.get(metricKey)
            : entitlement.effectiveCapabilities.limits?.[metricKey];

        if (projectedValue === null) continue;

        if (
            !Number.isInteger(projectedValue)
            || projectedValue < requirement.minimumEffectiveValue
        ) {
            throw new AppError(
                `La fonctionnalité "${featureKey}" nécessite une limite "${metricKey}" d’au moins ${requirement.minimumEffectiveValue}.`,
                409,
            );
        }
    }
};

const assertCreateFeatureOverrideGroupOperational = async ({
    groupData,
    now = new Date(),
}) => {
    if (!groupData) throw new TypeError('groupData is required');
    assertObjectId(groupData.workspaceId, 'workspaceId');

    if (!isValidDate(now)) throw new TypeError('now must be a valid Date');

    await assertFeatureOperationalLimits({
        workspaceId: groupData.workspaceId,
        featureKey: groupData.featureKey,
        relatedLimits: groupData.relatedLimits ?? [],
        at: resolveAssessmentDate({
            startsAt: groupData.startsAt,
            now,
        }),
    });
};

const assertUpdateFeatureOverrideGroupOperational = async ({
    overrideId,
    groupData,
    now = new Date(),
}) => {
    assertObjectId(overrideId, 'overrideId');
    if (!groupData) throw new TypeError('groupData is required');
    if (!isValidDate(now)) throw new TypeError('now must be a valid Date');

    if (groupData.featureEnabled === false) return;

    const primary = await EntitlementOverride.findById(overrideId)
        .select('workspace targetType featureKey featureEnabled startsAt')
        .lean();

    if (!primary) {
        throw new AppError('Dérogation introuvable.', 404);
    }

    if (primary.targetType !== ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
        throw new AppError(
            'Cette dérogation ne cible pas une fonctionnalité.',
            409,
        );
    }

    const remainsEnabled = groupData.featureEnabled ?? primary.featureEnabled;
    if (!remainsEnabled) return;

    await assertFeatureOperationalLimits({
        workspaceId: primary.workspace,
        featureKey: primary.featureKey,
        relatedLimits: groupData.relatedLimits ?? [],
        at: resolveAssessmentDate({
            startsAt: groupData.startsAt ?? primary.startsAt,
            now,
        }),
    });
};

const assertUpdateLimitOverrideWithinPolicy = async ({
    overrideId,
    overrideData,
}) => {
    if (!Object.hasOwn(overrideData ?? {}, 'limitValue')) return;

    assertObjectId(overrideId, 'overrideId');

    const override = await EntitlementOverride.findById(overrideId)
        .select('targetType metricKey')
        .lean();

    if (!override) {
        throw new AppError('Dérogation introuvable.', 404);
    }

    if (override.targetType !== ENTITLEMENT_OVERRIDE_TARGET.LIMIT) {
        return;
    }

    assertLimitValueWithinPolicy({
        metricKey: override.metricKey,
        limitValue: overrideData.limitValue,
    });
};


export {
    assertCreateFeatureOverrideGroupOperational,
    assertLimitValueWithinPolicy,
    assertUpdateFeatureOverrideGroupOperational,
    assertUpdateLimitOverrideWithinPolicy,
};
