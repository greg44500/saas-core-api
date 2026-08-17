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
    listPublicPlans,
} from '../../modules/plan/plan.service.js';


vi.mock(
    '../../modules/plan/plan.service.js',
    () => ({
        listPublicPlans: vi.fn(),
    }),
);


describe('plan.controller', () => {
    it('retourne le catalogue public avec un contrat JSON explicite', async () => {
        listPublicPlans.mockResolvedValue([
            {
                _id: {
                    toString: () => 'plan-id',
                },
                key: 'free',
                name: 'Free',
                description: 'Plan gratuit.',
                displayOrder: 0,
                currency: 'EUR',
                priceMonthlyExclTaxMinor: 0,
                priceYearlyExclTaxMinor: 0,
                features: [
                    'file_upload',
                ],
                limits: new Map([
                    ['members', 1],
                    ['storage_bytes', null],
                ]),

                /*
                 * Ce champ interne ne doit pas être recopié par le contrôleur
                 * dans la réponse publique.
                 */
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
        expect(res.status).toHaveBeenCalledWith(200);

        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                plans: [
                    {
                        id: 'plan-id',
                        key: 'free',
                        name: 'Free',
                        description: 'Plan gratuit.',
                        displayOrder: 0,
                        currency: 'EUR',
                        priceMonthlyExclTaxMinor: 0,
                        priceYearlyExclTaxMinor: 0,
                        features: [
                            'file_upload',
                        ],
                        limits: {
                            members: 1,
                            storage_bytes: null,
                        },
                    },
                ],
            },
        });
    });
});