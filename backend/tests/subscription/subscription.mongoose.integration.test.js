import mongoose from 'mongoose';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';

import {
    BILLING_INTERVAL,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    connectTestDatabase,
    disconnectTestDatabase,
} from '../helpers/testDatabase.js';

const { ObjectId } = mongoose.Types;

const createdSubscriptionIds = [];

const buildCommercialSubscriptionData = ({
    currentPeriodStart = new Date('2026-08-29T12:00:00.000Z'),
    currentPeriodEnd = new Date('2026-09-29T12:00:00.000Z'),
    trialEndsAt = null,
} = {}) => ({
    workspace: new ObjectId(),
    plan: new ObjectId(),
    kind: SUBSCRIPTION_KIND.COMMERCIAL,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodStart,
    currentPeriodEnd,
    trialEndsAt,
    billingInterval: BILLING_INTERVAL.MONTHLY,
    currency: 'EUR',
    priceExclTaxMinor: 1900,
});

const createCommercialSubscription = async (overrides = {}) => {
    const subscription = await Subscription.create(
        buildCommercialSubscriptionData(overrides),
    );

    createdSubscriptionIds.push(subscription._id);

    return subscription;
};

describe('Subscription real Mongoose validation', () => {
    beforeAll(async () => {
        await connectTestDatabase();
    });

    afterAll(async () => {
        if (createdSubscriptionIds.length > 0) {
            await Subscription.collection.deleteMany({
                _id: {
                    $in: createdSubscriptionIds,
                },
            });
        }

        await disconnectTestDatabase();
    });

    it('persiste une souscription dont les bornes temporelles sont cohérentes', async () => {
        const subscription = await createCommercialSubscription();

        expect(subscription._id).toBeInstanceOf(ObjectId);
        expect(subscription.currentPeriodEnd).toEqual(
            new Date('2026-09-29T12:00:00.000Z'),
        );
    });

    it('refuse save() lorsque currentPeriodEnd précède currentPeriodStart', async () => {
        const subscription = new Subscription(
            buildCommercialSubscriptionData({
                currentPeriodStart:
                    new Date('2026-08-29T12:00:00.000Z'),
                currentPeriodEnd:
                    new Date('2026-08-28T12:00:00.000Z'),
            }),
        );

        await expect(subscription.save()).rejects.toThrow(
            'La fin de période doit être postérieure au début de période.',
        );
    });

    it('refuse save() lorsque trialEndsAt précède currentPeriodStart', async () => {
        const subscription = new Subscription(
            buildCommercialSubscriptionData({
                trialEndsAt:
                    new Date('2026-08-28T12:00:00.000Z'),
            }),
        );

        await expect(subscription.save()).rejects.toThrow(
            'La fin de l’essai doit être postérieure au début de période.',
        );
    });

    it('autorise findOneAndUpdate() à modifier seulement currentPeriodEnd lorsque la nouvelle borne reste valide', async () => {
        const subscription = await createCommercialSubscription();
        const nextPeriodEnd = new Date('2026-10-29T12:00:00.000Z');

        const updated = await Subscription.findOneAndUpdate(
            {
                _id: subscription._id,
            },
            {
                $set: {
                    currentPeriodEnd: nextPeriodEnd,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
        );

        expect(updated.currentPeriodEnd).toEqual(nextPeriodEnd);
    });

    it('refuse findOneAndUpdate() lorsque currentPeriodEnd seul casserait la période persistée', async () => {
        const subscription = await createCommercialSubscription();

        await expect(
            Subscription.findOneAndUpdate(
                {
                    _id: subscription._id,
                },
                {
                    $set: {
                        currentPeriodEnd:
                            new Date('2026-08-28T12:00:00.000Z'),
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            ),
        ).rejects.toThrow(
            'La fin de période doit être postérieure au début de période.',
        );
    });

    it('refuse findOneAndUpdate() lorsque currentPeriodStart seul dépasserait currentPeriodEnd persisté', async () => {
        const subscription = await createCommercialSubscription();

        await expect(
            Subscription.findOneAndUpdate(
                {
                    _id: subscription._id,
                },
                {
                    $set: {
                        currentPeriodStart:
                            new Date('2026-09-30T12:00:00.000Z'),
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            ),
        ).rejects.toThrow(
            'La fin de période doit être postérieure au début de période.',
        );
    });

    it('refuse findOneAndUpdate() lorsque trialEndsAt seul précéderait currentPeriodStart persisté', async () => {
        const subscription = await createCommercialSubscription();

        await expect(
            Subscription.findOneAndUpdate(
                {
                    _id: subscription._id,
                },
                {
                    $set: {
                        trialEndsAt:
                            new Date('2026-08-28T12:00:00.000Z'),
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            ),
        ).rejects.toThrow(
            'La fin de l’essai doit être postérieure au début de période.',
        );
    });

    it('conserve les validateurs de chemin standards sur findOneAndUpdate()', async () => {
        const subscription = await createCommercialSubscription();

        await expect(
            Subscription.findOneAndUpdate(
                {
                    _id: subscription._id,
                },
                {
                    $set: {
                        priceExclTaxMinor: -1,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            ),
        ).rejects.toThrow(
            'Le prix HT de la souscription doit être un entier positif ou nul.',
        );
    });
});
