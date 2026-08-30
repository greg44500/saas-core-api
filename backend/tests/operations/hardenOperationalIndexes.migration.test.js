import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { AuditLog } from '../../modules/auditLog/auditLog.model.js';
import { File } from '../../modules/file/file.model.js';
import { Plan } from '../../modules/plan/plan.model.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import { User } from '../../modules/users/user.model.js';
import { Workspace } from '../../modules/workspace/workspace.model.js';
import { WorkspaceMember } from '../../modules/workspaceMember/workspaceMember.model.js';
import {
    hardenOperationalIndexes,
} from '../../migrations/hardenOperationalIndexes.migration.js';

const MODELS = [
    Subscription,
    File,
    User,
    Workspace,
    WorkspaceMember,
    Plan,
    AuditLog,
];

const mockExistingIndexes = (indexesByModel = new Map()) => {
    for (const model of MODELS) {
        vi.spyOn(model.collection, 'indexes').mockResolvedValue(
            indexesByModel.get(model)
            ?? [{ name: '_id_', key: { _id: 1 } }],
        );
    }
};

const mockCreateIndexes = () => MODELS.map((model) =>
    vi.spyOn(model.collection, 'createIndex')
        .mockResolvedValue('created'));

describe('hardenOperationalIndexes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('crée tous les index opérationnels lorsqu’ils sont absents', async () => {
        mockExistingIndexes();
        const createIndexSpies = mockCreateIndexes();

        const result = await hardenOperationalIndexes();

        expect(result.createdCount).toBe(12);
        expect(result.totalExpected).toBe(12);
        expect(result.created).toContain(
            'subscription_trial_expiration_batch_v2',
        );
        expect(result.created).toContain('files_pending_purge_v2');
        expect(result.created).toContain('users_platform_created_at');
        expect(result.created).toContain(
            'audit_logs_workspace_created_at',
        );

        expect(
            createIndexSpies.reduce(
                (total, spy) => total + spy.mock.calls.length,
                0,
            ),
        ).toBe(12);

        expect(File.collection.createIndex).toHaveBeenCalledWith(
            { purgeScheduledAt: 1, _id: 1 },
            {
                name: 'files_pending_purge_v2',
                partialFilterExpression: { status: 'deleted' },
            },
        );
    });

    it('est idempotente lorsque les index attendus existent déjà', async () => {
        mockExistingIndexes(new Map([
            [
                Subscription,
                [
                    { name: '_id_', key: { _id: 1 } },
                    {
                        name: 'subscription_trial_expiration_batch_v2',
                        key: {
                            kind: 1,
                            status: 1,
                            trialEndsAt: 1,
                            _id: 1,
                        },
                    },
                    {
                        name: 'subscription_scheduled_cancellation_batch_v2',
                        key: {
                            kind: 1,
                            status: 1,
                            cancelAtPeriodEnd: 1,
                            currentPeriodEnd: 1,
                            _id: 1,
                        },
                    },
                    {
                        name: 'subscription_scheduled_downgrade_batch_v2',
                        key: {
                            kind: 1,
                            status: 1,
                            'scheduledChange.type': 1,
                            'scheduledChange.effectiveAt': 1,
                            _id: 1,
                        },
                    },
                    {
                        name: 'subscription_platform_created_at',
                        key: { createdAt: -1, _id: -1 },
                    },
                ],
            ],
            [
                File,
                [
                    { name: '_id_', key: { _id: 1 } },
                    {
                        name: 'files_pending_purge_v2',
                        key: { purgeScheduledAt: 1, _id: 1 },
                        partialFilterExpression: { status: 'deleted' },
                    },
                    {
                        name: 'files_workspace_active_created_at',
                        key: {
                            workspace: 1,
                            status: 1,
                            createdAt: -1,
                            _id: -1,
                        },
                    },
                ],
            ],
            [
                User,
                [
                    { name: '_id_', key: { _id: 1 } },
                    {
                        name: 'users_platform_created_at',
                        key: { createdAt: -1, _id: -1 },
                    },
                ],
            ],
            [
                Workspace,
                [
                    { name: '_id_', key: { _id: 1 } },
                    {
                        name: 'workspaces_platform_created_at',
                        key: { createdAt: -1, _id: -1 },
                    },
                ],
            ],
            [
                WorkspaceMember,
                [
                    { name: '_id_', key: { _id: 1 } },
                    {
                        name: 'workspace_members_joined_at',
                        key: {
                            workspace: 1,
                            status: 1,
                            joinedAt: 1,
                            _id: 1,
                        },
                    },
                ],
            ],
            [
                Plan,
                [
                    { name: '_id_', key: { _id: 1 } },
                    {
                        name: 'plans_platform_display_order',
                        key: {
                            displayOrder: 1,
                            createdAt: 1,
                            _id: 1,
                        },
                    },
                ],
            ],
            [
                AuditLog,
                [
                    { name: '_id_', key: { _id: 1 } },
                    {
                        name: 'audit_logs_global_created_at',
                        key: { createdAt: -1, _id: -1 },
                    },
                    {
                        name: 'audit_logs_workspace_created_at',
                        key: {
                            workspace: 1,
                            createdAt: -1,
                            _id: -1,
                        },
                    },
                ],
            ],
        ]));
        const createIndexSpies = mockCreateIndexes();

        const result = await hardenOperationalIndexes();

        expect(result).toEqual({
            created: [],
            createdCount: 0,
            totalExpected: 12,
        });

        for (const spy of createIndexSpies) {
            expect(spy).not.toHaveBeenCalled();
        }
    });

    it('refuse un index nommé existant avec une définition incompatible', async () => {
        mockExistingIndexes(new Map([
            [
                Subscription,
                [
                    { name: '_id_', key: { _id: 1 } },
                    {
                        name: 'subscription_trial_expiration_batch_v2',
                        key: {
                            kind: 1,
                            status: 1,
                            trialEndsAt: -1,
                            _id: 1,
                        },
                    },
                ],
            ],
        ]));
        const createIndexSpies = mockCreateIndexes();

        await expect(
            hardenOperationalIndexes(),
        ).rejects.toThrow(
            'L’index subscription_trial_expiration_batch_v2 existe avec une définition incompatible',
        );

        for (const spy of createIndexSpies) {
            expect(spy).not.toHaveBeenCalled();
        }
    });
});
