import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
    findWorkspaceById: vi.fn(),
    getNextEntitlementChangeAt: vi.fn(),
    getWorkspaceEffectiveEntitlement: vi.fn(),
}));

vi.mock(
    '../../../modules/workspace/workspace.model.js',
    () => ({
        Workspace: {
            findById: mocks.findWorkspaceById,
        },
    }),
);

vi.mock(
    '../../../modules/subscriptions/subscription.service.js',
    () => ({
        getWorkspaceEffectiveEntitlement:
            mocks.getWorkspaceEffectiveEntitlement,
    }),
);

vi.mock(
    '../../../modules/entitlementOverride/entitlementOverrideSchedule.service.js',
    () => ({
        getNextEntitlementChangeAt:
            mocks.getNextEntitlementChangeAt,
    }),
);

import {
    getPlatformEntitlementContext,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementContext.service.js';


describe('platformEntitlementContext.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.findWorkspaceById.mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue({
                    _id: {
                        toString: () => 'workspace-id',
                    },
                    name: 'Workspace Démo',
                }),
            }),
        });

        mocks.getWorkspaceEffectiveEntitlement.mockResolvedValue({
            plan: {
                _id: {
                    toString: () => 'plan-id',
                },
                key: 'free',
                name: 'Free',
                features: ['file_upload'],
                limits: new Map([
                    ['members', 1],
                ]),
            },
            effectiveCapabilities: {
                features: [
                    'file_upload',
                    'team_management',
                ],
                limits: {
                    members: 2,
                },
                appliedOverrides: [
                    {
                        id: 'override-id',
                        targetType: 'feature',
                        featureKey: 'team_management',
                        metricKey: null,
                        featureEnabled: true,
                        limitValue: null,
                        startsAt: new Date('2026-09-04T08:00:00.000Z'),
                        endsAt: null,
                        reason: 'Interne Platform',
                    },
                ],
            },
        });

        mocks.getNextEntitlementChangeAt.mockResolvedValue(
            new Date('2026-09-05T08:00:00.000Z'),
        );
    });

    it('sépare le plan catalogue de l’état effectif et masque la clé technique du plan', async () => {
        const at = new Date('2026-09-04T12:00:00.000Z');
        const context = await getPlatformEntitlementContext({
            workspaceId: 'workspace-id',
            at,
        });

        expect(context).toEqual({
            workspace: {
                id: 'workspace-id',
                name: 'Workspace Démo',
            },
            plan: {
                id: 'plan-id',
                name: 'Free',
                features: ['file_upload'],
                limits: {
                    members: 1,
                },
            },
            effective: {
                features: [
                    'file_upload',
                    'team_management',
                ],
                limits: {
                    members: 2,
                },
            },
            appliedOverrides: [
                {
                    id: 'override-id',
                    targetType: 'feature',
                    featureKey: 'team_management',
                    metricKey: null,
                    featureEnabled: true,
                    limitValue: null,
                    startsAt: new Date('2026-09-04T08:00:00.000Z'),
                    endsAt: null,
                },
            ],
            nextEntitlementChangeAt:
                new Date('2026-09-05T08:00:00.000Z'),
        });

        expect(context.plan).not.toHaveProperty('key');
        expect(
            mocks.getNextEntitlementChangeAt,
        ).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            at,
        });

        expect(
            context.appliedOverrides[0],
        ).not.toHaveProperty('reason');
    });
});
