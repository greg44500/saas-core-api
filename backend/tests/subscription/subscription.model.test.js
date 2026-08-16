import mongoose from 'mongoose';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    DISCOUNT_TYPE,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';

import {
    Subscription,
} from '../../modules/subscriptions/subscription.model.js';


const { ObjectId } = mongoose.Types;


/**
 * Construit les données minimales d'une souscription gratuite valide.
 *
 * Chaque appel crée de nouveaux ObjectId afin qu'un test ne partage pas
 * accidentellement ses données avec un autre.
 */
const buildValidFreeSubscriptionData = () => ({
    workspace: new ObjectId(),
    plan: new ObjectId(),
    currency: 'EUR',
    priceExclTaxMinor: 0,
});


describe('Subscription model', () => {
    it('crée une souscription gratuite valide avec ses valeurs par défaut', async () => {
        const subscription = new Subscription(
            buildValidFreeSubscriptionData(),
        );

        await subscription.validate();

        expect(subscription.workspace).toBeInstanceOf(ObjectId);
        expect(subscription.plan).toBeInstanceOf(ObjectId);

        expect(subscription.status).toBe(
            SUBSCRIPTION_STATUS.ACTIVE,
        );

        expect(subscription.currentPeriodStart).toBeInstanceOf(Date);
        expect(subscription.currentPeriodEnd).toBeNull();
        expect(subscription.trialEndsAt).toBeNull();
        expect(subscription.cancelAtPeriodEnd).toBe(false);

        expect(subscription.billingInterval).toBe(
            BILLING_INTERVAL.NONE,
        );

        expect(subscription.currency).toBe('EUR');
        expect(subscription.priceExclTaxMinor).toBe(0);

        expect(subscription.provider).toBe(
            BILLING_PROVIDER.MANUAL,
        );

        expect(subscription.providerCustomerId).toBeNull();
        expect(subscription.providerSubscriptionId).toBeNull();

        expect(subscription.discountType).toBe(
            DISCOUNT_TYPE.NONE,
        );

        expect(subscription.discountValue).toBe(0);
        expect(subscription.discountReason).toBeNull();
        expect(subscription.discountEndsAt).toBeNull();

        expect(subscription.manualOverride).toBe(false);
        expect(subscription.manualOverrideReason).toBeNull();
        expect(subscription.manualOverrideBy).toBeNull();

        expect(subscription.createdBy).toBeNull();
        expect(subscription.updatedBy).toBeNull();
    });


    it('refuse un statut de souscription inconnu', async () => {
        const subscription = new Subscription({
            ...buildValidFreeSubscriptionData(),
            status: 'unknown',
        });

        await expect(
            subscription.validate(),
        ).rejects.toThrow();
    });


    it('refuse une périodicité de facturation inconnue', async () => {
        const subscription = new Subscription({
            ...buildValidFreeSubscriptionData(),
            billingInterval: 'weekly',
        });

        await expect(
            subscription.validate(),
        ).rejects.toThrow();
    });


    it('refuse une fin de période antérieure au début de période', async () => {
        const currentPeriodStart =
            new Date('2026-08-16T12:00:00.000Z');

        const subscription = new Subscription({
            ...buildValidFreeSubscriptionData(),
            currentPeriodStart,
            currentPeriodEnd:
                new Date('2026-08-15T12:00:00.000Z'),
        });

        await expect(
            subscription.validate(),
        ).rejects.toThrow(
            'La fin de période doit être postérieure au début de période.',
        );
    });


    it('refuse un prix HT négatif', async () => {
        const subscription = new Subscription({
            ...buildValidFreeSubscriptionData(),
            priceExclTaxMinor: -1,
        });

        await expect(
            subscription.validate(),
        ).rejects.toThrow(
            'Le prix HT de la souscription doit être un entier positif ou nul.',
        );
    });


    it('refuse une valeur de réduction négative', async () => {
        const subscription = new Subscription({
            ...buildValidFreeSubscriptionData(),
            discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
            discountValue: -1,
        });

        await expect(
            subscription.validate(),
        ).rejects.toThrow(
            'La valeur de réduction doit être un entier positif ou nul.',
        );
    });
});