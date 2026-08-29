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


describe('migrateSubscriptionLifecycleIndexes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('crée les deux index lorsqu’ils sont absents', async () => {
        vi.spyOn(Subscription.collection, 'indexes')
            .mockResolvedValue([{ name: '_id_', key: { _id: 1 } }]);

        const createIndexSpy = vi
            .spyOn(Subscription.collection, 'createIndex')
            .mockResolvedValue('created');

        const result = await migrateSubscriptionLifecycleIndexes();

        expect(createIndexSpy).toHaveBeenCalledTimes(2);
        expect(createIndexSpy).toHaveBeenNthCalledWith(
            1,
            {
                kind: 1,
                status: 1,
                trialEndsAt: 1,
            },
            { name: 'subscription_trial_expiration_lookup' },
        );
        expect(createIndexSpy).toHaveBeenNthCalledWith(
            2,
            {
                kind: 1,
                status: 1,
                cancelAtPeriodEnd: 1,
                currentPeriodEnd: 1,
            },
            { name: 'subscription_scheduled_cancellation_lookup' },
        );
        expect(result).toEqual({
            trialExpirationIndexCreated: true,
            scheduledCancellationIndexCreated: true,
        });
    });

    it('est idempotente lorsque les deux index existent déjà', async () => {
        vi.spyOn(Subscription.collection, 'indexes').mockResolvedValue([
            {
                name: 'trial',
                key: { kind: 1, status: 1, trialEndsAt: 1 },
            },
            {
                name: 'cancel',
                key: {
                    kind: 1,
                    status: 1,
                    cancelAtPeriodEnd: 1,
                    currentPeriodEnd: 1,
                },
            },
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
        });
    });

    it('ne crée que l’index manquant', async () => {
        vi.spyOn(Subscription.collection, 'indexes').mockResolvedValue([
            {
                name: 'trial',
                key: { kind: 1, status: 1, trialEndsAt: 1 },
            },
        ]);

        const createIndexSpy = vi
            .spyOn(Subscription.collection, 'createIndex')
            .mockResolvedValue('created');

        const result = await migrateSubscriptionLifecycleIndexes();

        expect(createIndexSpy).toHaveBeenCalledOnce();
        expect(createIndexSpy).toHaveBeenCalledWith(
            {
                kind: 1,
                status: 1,
                cancelAtPeriodEnd: 1,
                currentPeriodEnd: 1,
            },
            { name: 'subscription_scheduled_cancellation_lookup' },
        );
        expect(result).toEqual({
            trialExpirationIndexCreated: false,
            scheduledCancellationIndexCreated: true,
        });
    });
});
