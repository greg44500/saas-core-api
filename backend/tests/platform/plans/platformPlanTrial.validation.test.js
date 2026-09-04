import { describe, expect, it } from 'vitest';

import {
    createPlatformPlanBodySchema,
    updatePlatformPlanBodySchema,
} from '../../../modules/platform/plans/platformPlans.validation.js';

const baseCreatePayload = {
    name: 'Premium',
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 7900,
    priceYearlyExclTaxMinor: 79000,
    limits: {
        members: 10,
        storage_bytes: 1073741824,
        file_uploads_monthly: 100,
    },
};

describe('validation trial Platform Plans', () => {
    it('accepte un trial actif avec une durée positive', () => {
        const result = createPlatformPlanBodySchema.safeParse({
            ...baseCreatePayload,
            trialEnabled: true,
            trialDurationDays: 14,
        });

        expect(result.success).toBe(true);
    });

    it('refuse un trial actif sans durée', () => {
        const result = createPlatformPlanBodySchema.safeParse({
            ...baseCreatePayload,
            trialEnabled: true,
            trialDurationDays: null,
        });

        expect(result.success).toBe(false);
    });

    it('exige la paire complète lors d’une mise à jour du trial', () => {
        const result = updatePlatformPlanBodySchema.safeParse({
            trialEnabled: false,
        });

        expect(result.success).toBe(false);
    });

    it('accepte la désactivation atomique du trial', () => {
        const result = updatePlatformPlanBodySchema.safeParse({
            trialEnabled: false,
            trialDurationDays: null,
        });

        expect(result.success).toBe(true);
    });
});
