import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ATTENTION_TYPE,
} from '../../../modules/platform/overview/platformOverviewAttention.service.js';
import {
    projectPlatformOverviewByPermissions,
} from '../../../modules/platform/overview/platformOverviewProjection.service.js';

const COMPLETE_OVERVIEW = {
    generatedAt: new Date('2026-09-06T12:00:00.000Z'),
    period: {
        from: new Date('2026-08-06T12:00:00.000Z'),
        to: new Date('2026-09-06T12:00:00.000Z'),
    },
    kpis: {
        users: { total: 100 },
        workspaces: { total: 50 },
        activeCommercialSubscriptions: 20,
        contractedMrrEstimate: {
            basis: 'gross_before_discounts',
            isRevenue: false,
            byCurrency: [{ currency: 'EUR', amountMinor: 23700 }],
        },
    },
    users: { byStatus: { active: 95 } },
    workspaces: { byStatus: { active: 45, suspended: 5 } },
    planDistribution: [{
        plan: { id: 'plan-id', key: 'premium', name: 'Premium' },
        workspaceCount: 30,
        percentage: 60,
    }],
    subscriptionHealth: {
        activeCommercial: 20,
        trialsExpiringNext7Days: 2,
    },
    overrides: {
        active: 4,
        expiringNext7Days: 1,
    },
    usage: [{ key: 'storage_bytes', value: 1000 }],
    files: {
        totalCount: 10,
        totalSizeBytes: 1000,
        byType: [],
    },
    attention: {
        totalSignals: 15,
        counts: {
            pastDueSubscriptions: 3,
            suspendedWorkspaces: 5,
            failedAuditEvents: 4,
            trialsExpiringNext7Days: 2,
            overridesExpiringNext7Days: 1,
        },
        recentFailedAuditEvents: [{ id: 'audit-1' }],
        items: [
            { id: 'sub-1', type: PLATFORM_ATTENTION_TYPE.SUBSCRIPTION_PAST_DUE },
            { id: 'workspace-1', type: PLATFORM_ATTENTION_TYPE.WORKSPACE_SUSPENDED },
            { id: 'audit-1', type: PLATFORM_ATTENTION_TYPE.AUDIT_FAILED },
            { id: 'trial-1', type: PLATFORM_ATTENTION_TYPE.TRIAL_EXPIRING },
            { id: 'override-1', type: PLATFORM_ATTENTION_TYPE.OVERRIDE_EXPIRING },
        ],
    },
};


describe('projectPlatformOverviewByPermissions', () => {
    it('retire totalement les données d’audit quand audit_logs:read est absent', () => {
        const result = projectPlatformOverviewByPermissions({
            overview: COMPLETE_OVERVIEW,
            permissions: [
                PLATFORM_PERMISSION.OVERVIEW_READ,
                PLATFORM_PERMISSION.USERS_READ,
                PLATFORM_PERMISSION.WORKSPACES_READ,
                PLATFORM_PERMISSION.PLANS_READ,
                PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
                PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
            ],
        });

        expect(result.availableSections.audit).toBe(false);
        expect(result.attention.counts).not.toHaveProperty('failedAuditEvents');
        expect(result.attention).not.toHaveProperty('recentFailedAuditEvents');
        expect(result.attention.items).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: PLATFORM_ATTENTION_TYPE.AUDIT_FAILED,
                }),
            ]),
        );
        expect(result.attention.totalSignals).toBe(11);
    });

    it('ne révèle ni dérogation ni compteur caché lorsqu’entitlement_overrides:read est absent', () => {
        const result = projectPlatformOverviewByPermissions({
            overview: COMPLETE_OVERVIEW,
            permissions: [
                PLATFORM_PERMISSION.OVERVIEW_READ,
                PLATFORM_PERMISSION.USERS_READ,
                PLATFORM_PERMISSION.WORKSPACES_READ,
                PLATFORM_PERMISSION.PLANS_READ,
                PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
            ],
        });

        expect(result.availableSections.overrides).toBe(false);
        expect(result).not.toHaveProperty('overrides');
        expect(result.attention.counts).not.toHaveProperty(
            'overridesExpiringNext7Days',
        );
        expect(result.attention.items).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: PLATFORM_ATTENTION_TYPE.OVERRIDE_EXPIRING,
                }),
            ]),
        );
    });

    it('compose un cockpit minimal pour un rôle personnalisé sans dépendre de sa clé', () => {
        const result = projectPlatformOverviewByPermissions({
            overview: COMPLETE_OVERVIEW,
            permissions: [
                PLATFORM_PERMISSION.OVERVIEW_READ,
                PLATFORM_PERMISSION.USERS_READ,
            ],
        });

        expect(result.availableSections).toEqual({
            users: true,
            workspaces: false,
            plans: false,
            subscriptions: false,
            overrides: false,
            usage: false,
            files: false,
            audit: false,
        });
        expect(result.kpis).toEqual({
            users: COMPLETE_OVERVIEW.kpis.users,
        });
        expect(result.users).toEqual(COMPLETE_OVERVIEW.users);
        expect(result).not.toHaveProperty('workspaces');
        expect(result).not.toHaveProperty('planDistribution');
        expect(result).not.toHaveProperty('subscriptionHealth');
        expect(result).not.toHaveProperty('overrides');
        expect(result).not.toHaveProperty('usage');
        expect(result).not.toHaveProperty('files');
        expect(result).not.toHaveProperty('attention');
    });

    it('exige plans:read et workspaces:read pour exposer la répartition par plan', () => {
        const result = projectPlatformOverviewByPermissions({
            overview: COMPLETE_OVERVIEW,
            permissions: [
                PLATFORM_PERMISSION.OVERVIEW_READ,
                PLATFORM_PERMISSION.PLANS_READ,
            ],
        });

        expect(result.availableSections.plans).toBe(false);
        expect(result).not.toHaveProperty('planDistribution');
    });
});
