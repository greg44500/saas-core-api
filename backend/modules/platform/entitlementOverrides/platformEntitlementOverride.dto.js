import {
    ENTITLEMENT_OVERRIDE_LIFECYCLE,
} from '../../../constants/entitlementOverride.constants.js';


const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

const toId = (value) =>
    value?._id?.toString?.()
    ?? value?.toString?.()
    ?? null;

const serializeActor = (actor) => {
    if (!actor) {
        return null;
    }

    if (!actor._id) {
        return {
            id: toId(actor),
        };
    }

    return {
        id: actor._id.toString(),
        firstName: actor.firstName ?? null,
        lastName: actor.lastName ?? null,
        email: actor.email ?? null,
    };
};

const serializeWorkspace = (workspace) => {
    if (!workspace) {
        return null;
    }

    if (!workspace._id) {
        return {
            id: toId(workspace),
            name: null,
        };
    }

    return {
        id: workspace._id.toString(),
        name: workspace.name ?? null,
    };
};

/**
 * L'état d'un override est dérivé de ses bornes temporelles et de sa
 * révocation. Le persister créerait un second état à synchroniser par job et
 * pourrait laisser un droit commercial affiché comme actif après son échéance.
 */
const resolveEntitlementOverrideLifecycle = ({
    override,
    at = new Date(),
}) => {
    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    if (override.revokedAt) {
        return ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED;
    }

    if (override.startsAt > at) {
        return ENTITLEMENT_OVERRIDE_LIFECYCLE.SCHEDULED;
    }

    if (override.endsAt && override.endsAt <= at) {
        return ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED;
    }

    return ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE;
};

/**
 * DTO administratif explicite. Les documents Mongoose ne sont jamais renvoyés
 * directement afin qu'un futur champ interne ne devienne pas visible depuis
 * Platform par simple évolution du modèle.
 */
const serializePlatformEntitlementOverride = ({
    override,
    at = new Date(),
}) => ({
    id: override._id.toString(),
    workspace: serializeWorkspace(override.workspace),
    targetType: override.targetType,
    featureKey: override.featureKey ?? null,
    metricKey: override.metricKey ?? null,
    featureEnabled: override.featureEnabled ?? null,
    limitValue: override.limitValue ?? null,
    source: override.source,
    startsAt: override.startsAt,
    endsAt: override.endsAt ?? null,
    lifecycle: resolveEntitlementOverrideLifecycle({
        override,
        at,
    }),
    reason: override.reason,
    grantedBy: serializeActor(override.grantedBy),
    updatedBy: serializeActor(override.updatedBy),
    revokedAt: override.revokedAt ?? null,
    revokedBy: serializeActor(override.revokedBy),
    revokeReason: override.revokeReason ?? null,
    createdAt: override.createdAt,
    updatedAt: override.updatedAt,
});


export {
    resolveEntitlementOverrideLifecycle,
    serializePlatformEntitlementOverride,
};
