import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    migrateSubscriptionLifecycleIndexes,
} from '../../migrations/addSubscriptionLifecycleIndexes.migration.js';

const trialIndex = {
    name: 'trial',
    key: { kind: 1, status: 1, trialEndsAt: 1 },
};

const cancellationIndex = {
    name: 'cancel',
    key: {
        kind: 1,
        status: 1,
        cancelAtPeriodEnd: 1,
        currentPeriodEnd: 1,
    },
};

const downgradeIndex = {
    name: 'downgrade',
    key: {
        kind: 1,
        status: 1,
        'scheduledChange.type': 1,
        'scheduledChange.effectiveAt': 1,
    },
};

describe('migrateSubscriptionLifecycleIndexes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('crée les trois index lorsqu’ils sont absents', async () => {
        vi.spyOn(Subscription.collection, 'indexes')
            .mockResolvedValue([{ name: '_id_', key: { _id: 1 } }]);
        const createIndexSpy = vi
            .spyOn(Subscription.collection, 'createIndex')
            .mockResolvedValue('created');

        const result = await migrateSubscriptionLifecycleIndexes();

        expect(createIndexSpy).toHaveBeenCalledTimes(3);
        expect(createIndexSpy).toHaveBeenNthCalledWith(
            3,
            downgradeIndex.key,
            { name: 'subscription_scheduled_downgrade_lookup' },
        );
        expect(result).toEqual({
            trialExpirationIndexCreated: true,
            scheduledCancellationIndexCreated: true,
            scheduledDowngradeIndexCreated: true,
        });
    });

    it('est idempotente lorsque les trois index existent déjà', async () => {
        vi.spyOn(Subscription.collection, 'indexes').mockResolvedValue([
            trialIndex,
            cancellationIndex,
            downgradeIndex,
        ]);
        const createIndexSpy = vi.spyOn(
            Subscription.collection,
            'createIndex',
        );

        const result = await migrateSubscriptionLifecycleIndexes();

        expect(createIndexSpy).not.toHaveBeenCalled();
        expect(result).toEqual({
            trialExpirationIndexCreated: false,
            scheduledCancellationIndexCreated: false,
            scheduledDowngradeIndexCreated: false,
        });
    });

    it('ne crée que l’index de downgrade lorsqu’il manque seul', async () => {
        vi.spyOn(Subscription.collection, 'indexes').mockResolvedValue([
            trialIndex,
            cancellationIndex,
        ]);
        const createIndexSpy = vi
            .spyOn(Subscription.collection, 'createIndex')
            .mockResolvedValue('created');

        const result = await migrateSubscriptionLifecycleIndexes();

        expect(createIndexSpy).toHaveBeenCalledOnce();
        expect(createIndexSpy).toHaveBeenCalledWith(
            downgradeIndex.key,
            { name: 'subscription_scheduled_downgrade_lookup' },
        );
        expect(result).toEqual({
            trialExpirationIndexCreated: false,
            scheduledCancellationIndexCreated: false,
            scheduledDowngradeIndexCreated: true,
        });
    });
});
