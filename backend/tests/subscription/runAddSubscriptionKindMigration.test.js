import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    Subscription,
} from '../../modules/subscriptions/subscription.model.js';
import {
    ensureSubscriptionKindTargetIndex,
    SUBSCRIPTION_KIND_TARGET_INDEX,
} from '../../migrations/runAddSubscriptionKindMigration.js';


describe('ensureSubscriptionKindTargetIndex', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('crée la contrainte cible lorsqu’elle est absente', async () => {
        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([
            {
                name: '_id_',
                key: { _id: 1 },
            },
        ]);

        const createIndexSpy = vi
            .spyOn(
                Subscription.collection,
                'createIndex',
            )
            .mockResolvedValue('workspace_1_kind_1');

        const result = await ensureSubscriptionKindTargetIndex();

        expect(createIndexSpy).toHaveBeenCalledWith(
            SUBSCRIPTION_KIND_TARGET_INDEX.key,
            SUBSCRIPTION_KIND_TARGET_INDEX.options,
        );
        expect(result).toEqual({ created: true });
    });

    it('reste idempotent lorsque la contrainte cible existe déjà', async () => {
        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([
            {
                name: 'workspace_1_kind_1',
                key: SUBSCRIPTION_KIND_TARGET_INDEX.key,
                unique: true,
                partialFilterExpression:
                    SUBSCRIPTION_KIND_TARGET_INDEX.options
                        .partialFilterExpression,
            },
        ]);

        const createIndexSpy = vi
            .spyOn(
                Subscription.collection,
                'createIndex',
            )
            .mockResolvedValue('workspace_1_kind_1');

        const result = await ensureSubscriptionKindTargetIndex();

        expect(createIndexSpy).not.toHaveBeenCalled();
        expect(result).toEqual({ created: false });
    });

    it('refuse un index de même clé avec des options incompatibles', async () => {
        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([
            {
                name: 'workspace_1_kind_1',
                key: SUBSCRIPTION_KIND_TARGET_INDEX.key,
                unique: false,
            },
        ]);

        const createIndexSpy = vi
            .spyOn(
                Subscription.collection,
                'createIndex',
            )
            .mockResolvedValue('workspace_1_kind_1');

        await expect(
            ensureSubscriptionKindTargetIndex(),
        ).rejects.toThrow(
            'Un index workspace + kind existe avec des options incompatibles ; intervention manuelle requise.',
        );

        expect(createIndexSpy).not.toHaveBeenCalled();
    });
});
