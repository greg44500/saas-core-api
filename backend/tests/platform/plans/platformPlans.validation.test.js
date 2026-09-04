import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createPlatformPlanBodySchema,
    platformPlanIdParamsSchema,
    updatePlatformPlanBodySchema,
} from '../../../modules/platform/plans/platformPlans.validation.js';


describe('createPlatformPlanBodySchema', () => {
    const validPayload = {
        name: 'Starter',
        description: 'Offre de démarrage',
        status: 'active',
        isPublic: true,
        displayOrder: 1,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 1990,
        priceYearlyExclTaxMinor: 19900,
        features: [
            'file_upload',
        ],
        limits: {
            members: 5,
            storage_bytes: 1073741824,
            file_uploads_monthly: 100,
        },
    };

    it('accepte un payload de création valide sans clé technique', () => {
        const result =
            createPlatformPlanBodySchema.safeParse(
                validPayload,
            );

        expect(result.success).toBe(true);
    });

    it('normalise la devise en majuscules', () => {
        const result =
            createPlatformPlanBodySchema.parse({
                ...validPayload,
                currency: 'eur',
            });

        expect(result.currency).toBe('EUR');
    });

    it('accepte null pour une limite explicitement illimitée', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                limits: {
                    storage_bytes: null,
                },
            });

        expect(result.success).toBe(true);
    });

    it('refuse une clé technique fournie par le client', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                key: 'starter',
            });

        expect(result.success).toBe(false);
    });

    it('refuse une feature dont le format est invalide', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                features: [
                    'file-upload',
                ],
            });

        expect(result.success).toBe(false);
    });

    it('refuse les features dupliquées', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                features: [
                    'file_upload',
                    'file_upload',
                ],
            });

        expect(result.success).toBe(false);
    });

    it('refuse une clé de limite dont le format est invalide', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                limits: {
                    'storage-bytes': 1024,
                },
            });

        expect(result.success).toBe(false);
    });

    it('refuse une limite décimale', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                limits: {
                    storage_bytes: 10.5,
                },
            });

        expect(result.success).toBe(false);
    });

    it('refuse une limite négative', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                limits: {
                    storage_bytes: -1,
                },
            });

        expect(result.success).toBe(false);
    });

    it('refuse un prix mensuel décimal', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                priceMonthlyExclTaxMinor: 19.9,
            });

        expect(result.success).toBe(false);
    });

    it('refuse un prix annuel négatif', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                priceYearlyExclTaxMinor: -1,
            });

        expect(result.success).toBe(false);
    });

    it('refuse un statut inconnu', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                status: 'deleted',
            });

        expect(result.success).toBe(false);
    });

    it('refuse les propriétés inconnues', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                ...validPayload,
                unexpectedField: true,
            });

        expect(result.success).toBe(false);
    });

    it('accepte les champs optionnels absents', () => {
        const result =
            createPlatformPlanBodySchema.safeParse({
                name: 'Starter',
                currency: 'EUR',
                priceMonthlyExclTaxMinor: 1990,
                priceYearlyExclTaxMinor: 19900,
            });

        expect(result.success).toBe(true);
    });
});

describe('platformPlanIdParamsSchema', () => {
    it('accepte un planId MongoDB valide', () => {
        const result =
            platformPlanIdParamsSchema.safeParse({
                planId: '507f1f77bcf86cd799439011',
            });

        expect(result.success).toBe(true);
    });

    it('refuse un planId invalide', () => {
        const result =
            platformPlanIdParamsSchema.safeParse({
                planId: 'invalid-plan-id',
            });

        expect(result.success).toBe(false);
    });
});

describe('updatePlatformPlanBodySchema', () => {
    it('accepte une modification partielle valide', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({
                name: 'Starter Plus',
                isPublic: false,
            });

        expect(result.success).toBe(true);
    });

    it('normalise la devise en majuscules', () => {
        const result =
            updatePlatformPlanBodySchema.parse({
                currency: 'eur',
            });

        expect(result.currency).toBe('EUR');
    });

    it('accepte le passage du plan au statut inactive', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({
                status: 'inactive',
            });

        expect(result.success).toBe(true);
    });

    it('refuse le statut archived', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({
                status: 'archived',
            });

        expect(result.success).toBe(false);
    });

    it('refuse la modification de key', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({
                key: 'starter_v2',
            });

        expect(result.success).toBe(false);
    });

    it('refuse un payload vide', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({});

        expect(result.success).toBe(false);
    });

    it('refuse les features dupliquées', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({
                features: [
                    'file_upload',
                    'file_upload',
                ],
            });

        expect(result.success).toBe(false);
    });

    it('accepte null pour une limite explicitement illimitée', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({
                limits: {
                    storage_bytes: null,
                },
            });

        expect(result.success).toBe(true);
    });

    it('refuse une limite négative', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({
                limits: {
                    storage_bytes: -1,
                },
            });

        expect(result.success).toBe(false);
    });

    it('refuse une propriété inconnue', () => {
        const result =
            updatePlatformPlanBodySchema.safeParse({
                unknownField: true,
            });

        expect(result.success).toBe(false);
    });
});
