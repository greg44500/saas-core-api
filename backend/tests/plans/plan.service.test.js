import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { PLAN_STATUS } from '../../constants/plan.constants.js';
import { Plan } from '../../modules/plan/plan.model.js';

import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';

import {
    createPlan,
    listPublicPlans,
    validatePlanCapabilities,
} from '../../modules/plan/plan.service.js';


describe('Plan service', () => {
    afterEach(() => {
        // Restaure les véritables méthodes Mongoose après chaque test afin
        // qu'un mock ne puisse pas modifier le comportement du test suivant.
        vi.restoreAllMocks();
    });


    describe('validatePlanCapabilities', () => {
        it('accepte les capabilities déclarées dans un registre étendu', () => {
            const registry = createPlanCapabilityRegistry({
                features: ['custom_feature'],
                metrics: ['custom_metric'],
            });

            expect(() => {
                validatePlanCapabilities(
                    {
                        features: [
                            'file_upload',
                            'custom_feature',
                        ],
                        limits: {
                            members: 5,
                            custom_metric: 100,
                        },
                    },
                    registry,
                );
            }).not.toThrow();
        });


        it('refuse une fonctionnalité absente du registre actif', () => {
            expect(() => {
                validatePlanCapabilities({
                    features: ['unknown_feature'],
                });
            }).toThrow(
                'Fonctionnalités de plan inconnues : unknown_feature.',
            );
        });


        it('refuse une métrique absente du registre actif', () => {
            expect(() => {
                validatePlanCapabilities({
                    limits: new Map([
                        ['unknown_metric', 10],
                    ]),
                });
            }).toThrow(
                'Métriques de plan inconnues : unknown_metric.',
            );
        });
    });


    describe('createPlan', () => {
        it('crée un plan valide en attribuant les champs de traçabilité', async () => {
            const actorId = '507f1f77bcf86cd799439011';

            const planData = {
                key: 'starter',
                name: 'Starter',
                currency: 'EUR',
                priceMonthlyExclTraxMinor: 1990,
                priceYearlyExclTraxMinor: 19900,
                features: [
                    'file_upload',
                    'team_management',
                ],
                limits: {
                    members: 5,
                    storage_bytes: 1073741824,
                },
            };

            /*
             * La sauvegarde réelle est remplacée afin de tester uniquement
             * l'orchestration du service sans ouvrir de connexion MongoDB.
             *
             * Une fonction classique est utilisée pour conserver `this`,
             * qui représente ici le document Plan créé par le service.
             */
            const saveSpy = vi
                .spyOn(Plan.prototype, 'save')
                .mockImplementation(async function savePlan() {
                    return this;
                });

            const result = await createPlan({
                planData,
                actorId,
            });

            expect(saveSpy).toHaveBeenCalledOnce();

            expect(result.key).toBe('starter');
            expect(result.createdBy.toString()).toBe(actorId);
            expect(result.updatedBy.toString()).toBe(actorId);
        });


        it('ne sauvegarde pas le plan lorsqu’une capability est inconnue', async () => {
            const saveSpy = vi.spyOn(Plan.prototype, 'save');

            await expect(
                createPlan({
                    planData: {
                        key: 'invalid-plan',
                        name: 'Invalid plan',
                        currency: 'EUR',
                        priceMonthlyExclTraxMinor: 1000,
                        priceYearlyExclTraxMinor: 10000,
                        features: ['unknown_feature'],
                    },
                }),
            ).rejects.toThrow(
                'Fonctionnalités de plan inconnues : unknown_feature.',
            );

            // La validation fonctionnelle doit toujours précéder l'écriture.
            expect(saveSpy).not.toHaveBeenCalled();
        });
    });
});

describe('listPublicPlans', () => {
    it('retourne uniquement le catalogue actif et public dans l’ordre attendu', async () => {
        const publicPlans = [
            {
                key: 'free',
                name: 'Free',
                displayOrder: 0,
            },
            {
                key: 'starter',
                name: 'Starter',
                displayOrder: 10,
            },
        ];

        /*
         * Simule uniquement la chaîne Mongoose utilisée par le service :
         * find → select → sort → lean.
         */
        const leanMock = vi
            .fn()
            .mockResolvedValue(publicPlans);

        const sortMock = vi
            .fn()
            .mockReturnValue({
                lean: leanMock,
            });

        const selectMock = vi
            .fn()
            .mockReturnValue({
                sort: sortMock,
            });

        const findSpy = vi
            .spyOn(Plan, 'find')
            .mockReturnValue({
                select: selectMock,
            });

        const result = await listPublicPlans();

        expect(findSpy).toHaveBeenCalledWith({
            status: PLAN_STATUS.ACTIVE,
            isPublic: true,
        });

        expect(selectMock).toHaveBeenCalledWith(
            [
                'key',
                'name',
                'description',
                'displayOrder',
                'currency',
                'priceMonthlyExclTaxMinor',
                'priceYearlyExclTaxMinor',
                'features',
                'limits',
            ].join(' '),
        );

        expect(sortMock).toHaveBeenCalledWith({
            displayOrder: 1,
            name: 1,
        });

        expect(leanMock).toHaveBeenCalledOnce();
        expect(result).toBe(publicPlans);
    });
});