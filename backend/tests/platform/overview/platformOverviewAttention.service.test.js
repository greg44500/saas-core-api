import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_ATTENTION_STATE,
    PLATFORM_ATTENTION_TYPE,
    createPlatformOverviewAttentionService,
    sortAttentionItems,
} from '../../../modules/platform/overview/platformOverviewAttention.service.js';

const AT = new Date('2026-09-03T12:00:00.000Z');
const FROM = new Date('2026-08-03T12:00:00.000Z');
const TO = new Date('2026-09-03T12:00:00.000Z');

const createAggregateModel = (result, collectionName) => ({
    aggregate: vi.fn(async () => result),
    ...(collectionName
        ? { collection: { name: collectionName } }
        : {}),
});

describe('platformOverviewAttention.service', () => {
    it('compose des lignes homogènes sans exposer les motifs commerciaux des dérogations', async () => {
        const SubscriptionModel = createAggregateModel([
            {
                pastDue: [
                    {
                        _id: 'subscription-past-due',
                        workspace: 'workspace-1',
                        workspaceName: 'Acme',
                        updatedAt: new Date('2026-09-03T10:00:00.000Z'),
                    },
                ],
                trialsExpiring: [
                    {
                        _id: 'subscription-trial',
                        workspace: 'workspace-2',
                        workspaceName: 'Beta',
                        trialEndsAt: new Date('2026-09-05T12:00:00.000Z'),
                    },
                ],
            },
        ]);
        const WorkspaceModel = createAggregateModel(
            [
                {
                    _id: 'workspace-3',
                    name: 'Gamma',
                    statusChangedAt: new Date('2026-09-03T09:00:00.000Z'),
                    statusReason: 'administrative',
                },
            ],
            'workspaces',
        );
        const EntitlementOverrideModel = createAggregateModel([
            {
                _id: 'override-1',
                workspace: 'workspace-4',
                workspaceName: 'Delta',
                targetType: 'feature',
                targetKey: 'file_upload',
                endsAt: new Date('2026-09-04T12:00:00.000Z'),
                reason: 'Ne doit jamais traverser le DTO',
                source: 'support',
            },
        ]);
        const AuditLogModel = createAggregateModel([
            {
                _id: 'audit-1',
                workspace: 'workspace-1',
                workspaceName: 'Acme',
                action: 'LOGIN_FAILED',
                entityType: 'User',
                entityId: 'user-1',
                createdAt: new Date('2026-09-03T11:00:00.000Z'),
            },
        ]);

        const service = createPlatformOverviewAttentionService({
            WorkspaceModel,
            SubscriptionModel,
            EntitlementOverrideModel,
            AuditLogModel,
        });

        const items = await service({
            from: FROM,
            to: TO,
            at: AT,
        });

        expect(items.map((item) => item.type)).toEqual([
            PLATFORM_ATTENTION_TYPE.AUDIT_FAILED,
            PLATFORM_ATTENTION_TYPE.SUBSCRIPTION_PAST_DUE,
            PLATFORM_ATTENTION_TYPE.WORKSPACE_SUSPENDED,
            PLATFORM_ATTENTION_TYPE.OVERRIDE_EXPIRING,
            PLATFORM_ATTENTION_TYPE.TRIAL_EXPIRING,
        ]);
        expect(items[0]).toMatchObject({
            workspace: { id: 'workspace-1', name: 'Acme' },
            context: {
                action: 'LOGIN_FAILED',
                entityType: 'User',
                entityId: 'user-1',
            },
        });
        expect(items[3]).toMatchObject({
            type: PLATFORM_ATTENTION_TYPE.OVERRIDE_EXPIRING,
            context: {
                targetType: 'feature',
                targetKey: 'file_upload',
            },
        });
        expect(items[3]).not.toHaveProperty('reason');
        expect(items[3]).not.toHaveProperty('source');
        expect(items[3].context).not.toHaveProperty('reason');
        expect(items[3].context).not.toHaveProperty('source');

        expect(SubscriptionModel.aggregate).toHaveBeenCalledOnce();
        expect(WorkspaceModel.aggregate).toHaveBeenCalledOnce();
        expect(EntitlementOverrideModel.aggregate).toHaveBeenCalledOnce();
        expect(AuditLogModel.aggregate).toHaveBeenCalledOnce();
    });

    it('place les problèmes actuels avant les échéances puis applique un ordre temporel déterministe', () => {
        const items = sortAttentionItems([
            {
                id: 'upcoming-late',
                state: PLATFORM_ATTENTION_STATE.UPCOMING,
                referenceAt: '2026-09-06T00:00:00.000Z',
            },
            {
                id: 'current-old',
                state: PLATFORM_ATTENTION_STATE.CURRENT,
                referenceAt: '2026-09-01T00:00:00.000Z',
            },
            {
                id: 'upcoming-soon',
                state: PLATFORM_ATTENTION_STATE.UPCOMING,
                referenceAt: '2026-09-04T00:00:00.000Z',
            },
            {
                id: 'current-new',
                state: PLATFORM_ATTENTION_STATE.CURRENT,
                referenceAt: '2026-09-03T00:00:00.000Z',
            },
        ]);

        expect(items.map((item) => item.id)).toEqual([
            'current-new',
            'current-old',
            'upcoming-soon',
            'upcoming-late',
        ]);
    });
});
