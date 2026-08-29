import {
    describe,
    expect,
    it,
} from 'vitest';

import { PLAN_STATUS } from '../../constants/plan.constants.js';
import { Plan } from '../../modules/plan/plan.model.js';


describe('Plan model', () => {
    it('crée un plan valide avec les valeurs attendues', async () => {
        const plan = new Plan({
            key: 'starter',
            name: 'Starter',
            description: 'Plan de démarrage.',
            status: PLAN_STATUS.ACTIVE,
            isPublic: true,
            displayOrder: 10,
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 1990,
            priceYearlyExclTaxMinor: 19900,
            features: [
                'file_upload',
                'team_management',
            ],
            limits: {
                members: 5,
                storage_bytes: 1_073_741_824,
                file_uploads_monthly: 100,
            },
            createdBy: null,
            updatedBy: null,
        });

        await plan.validate();

        expect(plan.key).toBe('starter');
        expect(plan.name).toBe('Starter');
        expect(plan.description).toBe('Plan de démarrage.');

        expect(plan.status).toBe(PLAN_STATUS.ACTIVE);
        expect(plan.isPublic).toBe(true);
        expect(plan.displayOrder).toBe(10);

        expect(plan.currency).toBe('EUR');
        expect(plan.priceMonthlyExclTaxMinor).toBe(1990);
        expect(plan.priceYearlyExclTaxMinor).toBe(19900);

        expect(plan.features).toEqual([
            'file_upload',
            'team_management',
        ]);

        expect(plan.limits).toBeInstanceOf(Map);
        expect(plan.limits.get('members')).toBe(5);
        expect(plan.limits.get('storage_bytes')).toBe(1_073_741_824);
        expect(plan.limits.get('file_uploads_monthly')).toBe(100);

        expect(plan.createdBy).toBeNull();
        expect(plan.updatedBy).toBeNull();
    });


    it('normalise la clé du plan en minuscules', async () => {
        const plan = new Plan({
            key: 'PREMIUM',
            name: 'Premium',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 2990,
            priceYearlyExclTaxMinor: 29900,
        });

        await plan.validate();

        expect(plan.key).toBe('premium');
    });


    it('refuse une clé de plan dont le format est invalide', async () => {
        const plan = new Plan({
            key: 'Premium Plan!',
            name: 'Premium',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 2990,
            priceYearlyExclTaxMinor: 29900,
        });

        await expect(plan.validate()).rejects.toThrow();
    });


    it('applique les valeurs par défaut du plan', async () => {
        const plan = new Plan({
            key: 'business',
            name: 'Business',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 4990,
            priceYearlyExclTaxMinor: 49900,
        });

        await plan.validate();

        expect(plan.status).toBe(PLAN_STATUS.ACTIVE);
        expect(plan.isPublic).toBe(false);
        expect(plan.displayOrder).toBe(0);
        expect(plan.trialEnabled).toBe(false);
        expect(plan.trialDurationDays).toBeNull();

        expect(plan.features).toEqual([]);

        expect(plan.limits).toBeInstanceOf(Map);
        expect(plan.limits.size).toBe(0);

        expect(plan.createdBy).toBeNull();
        expect(plan.updatedBy).toBeNull();
    });


    it('refuse un statut inconnu', async () => {
        const plan = new Plan({
            key: 'enterprise',
            name: 'Enterprise',
            status: 'unknown',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 9990,
            priceYearlyExclTaxMinor: 99900,
        });

        await expect(plan.validate()).rejects.toThrow();
    });
    it('accepte null comme limite explicitement illimitée', async () => {
        const plan = new Plan({
            key: 'enterprise',
            name: 'Enterprise',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 9990,
            priceYearlyExclTaxMinor: 99900,
            limits: {
                members: null,
            },
        });

        await plan.validate();

        expect(plan.limits).toBeInstanceOf(Map);
        expect(plan.limits.has('members')).toBe(true);
        expect(plan.limits.get('members')).toBeNull();
    });

    it('refuse un prix mensuel négatif', async () => {
        const plan = new Plan({
            key: 'free',
            name: 'Free',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: -1,
            priceYearlyExclTaxMinor: 0,
        });

        await expect(plan.validate()).rejects.toThrow();
    });


    it('refuse un prix annuel négatif', async () => {
        const plan = new Plan({
            key: 'starter',
            name: 'Starter',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 1000,
            priceYearlyExclTaxMinor: -1,
        });

        await expect(plan.validate()).rejects.toThrow();
    });


    it('refuse un prix exprimé avec une valeur décimale', async () => {
        const plan = new Plan({
            key: 'premium',
            name: 'Premium',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 1990.5,
            priceYearlyExclTaxMinor: 19900,
        });

        await expect(plan.validate()).rejects.toThrow();
    });


    it('refuse une feature dont la clé est structurellement invalide', async () => {
        const plan = new Plan({
            key: 'business',
            name: 'Business',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 4990,
            priceYearlyExclTaxMinor: 49900,
            features: [
                'file_upload',
                'Invalid Feature!',
            ],
        });

        await expect(plan.validate()).rejects.toThrow();
    });


    it('refuse les features en doublon', async () => {
        const plan = new Plan({
            key: 'business',
            name: 'Business',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 4990,
            priceYearlyExclTaxMinor: 49900,
            features: [
                'file_upload',
                'file_upload',
            ],
        });

        await expect(plan.validate()).rejects.toThrow();
    });


    it('refuse une limite négative', async () => {
        const plan = new Plan({
            key: 'enterprise',
            name: 'Enterprise',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 9990,
            priceYearlyExclTaxMinor: 99900,
            limits: {
                members: -1,
            },
        });

        await expect(plan.validate()).rejects.toThrow();
    });


    it('refuse une limite décimale', async () => {
        const plan = new Plan({
            key: 'enterprise',
            name: 'Enterprise',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 9990,
            priceYearlyExclTaxMinor: 99900,
            limits: {
                members: 5.5,
            },
        });

        await expect(plan.validate()).rejects.toThrow();
    });


    it('refuse une clé de limite structurellement invalide', async () => {
        const plan = new Plan({
            key: 'enterprise',
            name: 'Enterprise',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 9990,
            priceYearlyExclTaxMinor: 99900,
            limits: {
                'Invalid Limit!': 10,
            },
        });

        await expect(plan.validate()).rejects.toThrow();
    });
    it('accepte une configuration de trial valide', async () => {
        const plan = new Plan({
            key: 'premium',
            name: 'Premium',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 2990,
            priceYearlyExclTaxMinor: 29900,
            trialEnabled: true,
            trialDurationDays: 14,
        });

        await plan.validate();

        expect(plan.trialEnabled).toBe(true);
        expect(plan.trialDurationDays).toBe(14);
    });


    it('refuse une durée lorsque le trial est désactivé', async () => {
        const plan = new Plan({
            key: 'free',
            name: 'Free',
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 0,
            priceYearlyExclTaxMinor: 0,
            trialEnabled: false,
            trialDurationDays: 14,
        });

        await expect(plan.validate()).rejects.toThrow(
            'La durée du trial doit être nulle lorsque le trial est désactivé.',
        );
    });


    it.each([
        null,
        0,
        -1,
        14.5,
    ])(
        'refuse une durée de trial invalide lorsque le trial est activé : %s',
        async (trialDurationDays) => {
            const plan = new Plan({
                key: 'starter',
                name: 'Starter',
                currency: 'EUR',
                priceMonthlyExclTaxMinor: 1990,
                priceYearlyExclTaxMinor: 19900,
                trialEnabled: true,
                trialDurationDays,
            });

            await expect(plan.validate()).rejects.toThrow(
                'La durée du trial doit être un entier strictement positif lorsque le trial est activé.',
            );
        },
    );
});