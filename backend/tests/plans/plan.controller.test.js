import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    list,
} from '../../modules/plan/plan.controller.js';

import {
    isBaselinePlan,
    listPublicPlans,
} from '../../modules/plan/plan.service.js';

vi.mock(
    '../../modules/plan/plan.service.js',
    () => ({
        isBaselinePlan: vi.fn(),
        listPublicPlans: vi.fn(),
    }),
);

describe('plan.controller', () => {
    it('retourne le catalogue public sans exposer la clé technique', async () => {
        isBaselinePlan.mockReturnValue(false);
        listPublicPlans.mockResolvedValue([
            {
                _id: {
                    toString: () => 'plan-id',
                },
                key: 'plan_internal',
                systemRole: null,
                name: 'Premium',
                description: 'Plan premium.',
                displayOrder: 10,
                currency: 'EUR',
                priceMonthlyExclTaxMinor: 7900,
                priceYearlyExclTaxMinor: 79000,
                trialEnabled: true,
                trialDurationDays: 14,
                features: ['file_upload'],
                limits: new Map([
                    ['members', 5],
                    ['storage_bytes', null],
                ]),
                createdBy: 'internal-user-id',
            },
        ]);

        const req = {};
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        await list(req, res);

        expect(listPublicPlans).toHaveBeenCalledOnce();
        expect(isBaselinePlan).toHaveBeenCalledOnce();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                plans: [
                    {
                        id: 'plan-id',
                        isBaseline: false,
                        name: 'Premium',
                        description: 'Plan premium.',
                        displayOrder: 10,
                        currency: 'EUR',
                        priceMonthlyExclTaxMinor: 7900,
                        priceYearlyExclTaxMinor: 79000,
                        trialEnabled: true,
                        trialDurationDays: 14,
                        features: ['file_upload'],
                        limits: {
                            members: 5,
                            storage_bytes: null,
                        },
                    },
                ],
            },
        });

        const payload = res.json.mock.calls[0][0];
        expect(payload.data.plans[0]).not.toHaveProperty('key');
    });
});
