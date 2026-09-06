import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ATTENTION_TYPE,
} from './platformOverviewAttention.service.js';


const hasPermission = (permissionSet, permission) => (
    permissionSet.has(permission)
);

const hasPermissions = (permissionSet, permissions) => (
    permissions.every((permission) => permissionSet.has(permission))
);

/**
 * Décrit les domaines réellement exposables dans le cockpit courant.
 *
 * Cette projection dépend exclusivement des permissions runtime. Elle ne
 * connaît aucun rôle système et fonctionne donc aussi pour les rôles
 * personnalisés.
 */
const resolvePlatformOverviewSections = (permissions = []) => {
    const permissionSet = new Set(permissions);

    return {
        users: hasPermission(
            permissionSet,
            PLATFORM_PERMISSION.USERS_READ,
        ),
        workspaces: hasPermission(
            permissionSet,
            PLATFORM_PERMISSION.WORKSPACES_READ,
        ),
        plans: hasPermissions(permissionSet, [
            PLATFORM_PERMISSION.PLANS_READ,
            PLATFORM_PERMISSION.WORKSPACES_READ,
        ]),
        subscriptions: hasPermission(
            permissionSet,
            PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
        ),
        overrides: hasPermission(
            permissionSet,
            PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
        ),
        usage: hasPermission(
            permissionSet,
            PLATFORM_PERMISSION.WORKSPACES_READ,
        ),
        files: hasPermission(
            permissionSet,
            PLATFORM_PERMISSION.WORKSPACES_READ,
        ),
        audit: hasPermission(
            permissionSet,
            PLATFORM_PERMISSION.AUDIT_LOGS_READ,
        ),
    };
};

const ATTENTION_TYPE_SECTION = Object.freeze({
    [PLATFORM_ATTENTION_TYPE.SUBSCRIPTION_PAST_DUE]: 'subscriptions',
    [PLATFORM_ATTENTION_TYPE.TRIAL_EXPIRING]: 'subscriptions',
    [PLATFORM_ATTENTION_TYPE.WORKSPACE_SUSPENDED]: 'workspaces',
    [PLATFORM_ATTENTION_TYPE.OVERRIDE_EXPIRING]: 'overrides',
    [PLATFORM_ATTENTION_TYPE.AUDIT_FAILED]: 'audit',
});

const projectAttention = ({ attention = {}, sections }) => {
    const counts = {};

    if (sections.subscriptions) {
        counts.pastDueSubscriptions =
            attention.counts?.pastDueSubscriptions ?? 0;
        counts.trialsExpiringNext7Days =
            attention.counts?.trialsExpiringNext7Days ?? 0;
    }

    if (sections.workspaces) {
        counts.suspendedWorkspaces =
            attention.counts?.suspendedWorkspaces ?? 0;
    }

    if (sections.overrides) {
        counts.overridesExpiringNext7Days =
            attention.counts?.overridesExpiringNext7Days ?? 0;
    }

    if (sections.audit) {
        counts.failedAuditEvents =
            attention.counts?.failedAuditEvents ?? 0;
    }

    const items = (attention.items ?? []).filter((item) => {
        const section = ATTENTION_TYPE_SECTION[item?.type];
        return section ? sections[section] === true : false;
    });

    const projected = {
        totalSignals: Object.values(counts).reduce(
            (sum, value) => sum + (Number(value) || 0),
            0,
        ),
        counts,
        items,
    };

    if (sections.audit) {
        projected.recentFailedAuditEvents =
            attention.recentFailedAuditEvents ?? [];
    }

    return projected;
};

/**
 * Réduit le cockpit complet au sous-ensemble que l'acteur est autorisé à
 * consulter. Le filtrage a lieu côté backend : React ne reçoit jamais les
 * métriques d'un domaine non autorisé.
 */
const projectPlatformOverviewByPermissions = ({
    overview,
    permissions = [],
}) => {
    if (!overview || typeof overview !== 'object') {
        throw new TypeError('overview is required to project Platform overview');
    }

    const sections = resolvePlatformOverviewSections(permissions);
    const projected = {
        generatedAt: overview.generatedAt,
        period: overview.period,
        availableSections: sections,
        kpis: {},
    };

    if (sections.users) {
        projected.kpis.users = overview.kpis?.users;
        projected.users = overview.users;
    }

    if (sections.workspaces) {
        projected.kpis.workspaces = overview.kpis?.workspaces;
        projected.workspaces = overview.workspaces;
    }

    if (sections.subscriptions) {
        projected.kpis.activeCommercialSubscriptions =
            overview.kpis?.activeCommercialSubscriptions;
        projected.kpis.contractedMrrEstimate =
            overview.kpis?.contractedMrrEstimate;
        projected.subscriptionHealth = overview.subscriptionHealth;
    }

    if (sections.plans) {
        projected.planDistribution = overview.planDistribution;
    }

    if (sections.overrides) {
        projected.overrides = overview.overrides;
    }

    if (sections.usage) {
        projected.usage = overview.usage;
    }

    if (sections.files) {
        projected.files = overview.files;
    }

    if (
        sections.subscriptions
        || sections.workspaces
        || sections.overrides
        || sections.audit
    ) {
        projected.attention = projectAttention({
            attention: overview.attention,
            sections,
        });
    }

    return projected;
};


export {
    ATTENTION_TYPE_SECTION,
    projectAttention,
    projectPlatformOverviewByPermissions,
    resolvePlatformOverviewSections,
};
