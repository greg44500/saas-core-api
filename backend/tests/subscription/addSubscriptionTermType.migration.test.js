import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_TERM_TYPE,
} from '../../constants/subscription.constants.js';
import {
    migrateSubscriptionTermType,
} from '../../migrations/addSubscriptionTermType.migration.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';


describe('migrateSubscriptionTermType', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('backfill baseline en open-ended et commerciale en fixed', async () => {
        vi.spyOn(
            Subscription.collection,
            'countDocuments',
        ).mockResolvedValue(0);

        const updateManySpy = vi.spyOn(
            Subscription.collection,
            'updateMany',
        )
            .mockResolvedValueOnce({
                matchedCount: 3,
                modifiedCount: 3,
            })
            .mockResolvedValueOnce({
                matchedCount: 2,
                modifiedCount: 2,
            });

        const result = await migrateSubscriptionTermType();

        expect(updateManySpy).toHaveBeenNthCalledWith(
            1,
            {
                termType: { $exists: false },
                kind: SUBSCRIPTION_KIND.BASELINE,
            },
            {
                $set: {
                    termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                },
            },
        );

        expect(updateManySpy).toHaveBeenNthCalledWith(
            2,
            {
                termType: { $exists: false },
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
            },
            {
                $set: {
                    termType: SUBSCRIPTION_TERM_TYPE.FIXED,
                },
            },
        );

        expect(result).toEqual({
            baselineMatched: 3,
            baselineModified: 3,
            commercialMatched: 2,
            commercialModified: 2,
        });
    });

    it('refuse de deviner lorsque kind est absent ou inconnu', async () => {
        vi.spyOn(
            Subscription.collection,
            'countDocuments',
        ).mockResolvedValue(1);

        const updateManySpy = vi.spyOn(
            Subscription.collection,
            'updateMany',
        );

        await expect(
            migrateSubscriptionTermType(),
        ).rejects.toThrow(/subscription-kind/);

        expect(updateManySpy).not.toHaveBeenCalled();
    });

    it('reste idempotente lorsque tous les documents sont déjà migrés', async () => {
        vi.spyOn(
            Subscription.collection,
            'countDocuments',
        ).mockResolvedValue(0);

        vi.spyOn(
            Subscription.collection,
            'updateMany',
        )
            .mockResolvedValueOnce({
                matchedCount: 0,
                modifiedCount: 0,
            })
            .mockResolvedValueOnce({
                matchedCount: 0,
                modifiedCount: 0,
            });

        await expect(
            migrateSubscriptionTermType(),
        ).resolves.toEqual({
            baselineMatched: 0,
            baselineModified: 0,
            commercialMatched: 0,
            commercialModified: 0,
        });
    });
});
