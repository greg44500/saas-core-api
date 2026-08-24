import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    enforcePlanLimit,
    evaluatePlanLimit,
    reservePlanLimitForEntitlement,
    resolvePlanMetricLimit,
} from '../../modules/plan/planLimit.service.js';
import {
    getWorkspacePlanEntitlement,
} from '../../modules/subscriptions/subscription.service.js';

import {
    reserveUsageMetricWithinLimit,
} from '../../modules/usageMetric/usageMetric.service.js';

import {
    PlanLimitExceededError,
} from '../../modules/plan/planLimitExceeded.error.js';

vi.mock(
    '../../modules/subscriptions/subscription.service.js',
    () => ({
        getWorkspacePlanEntitlement: vi.fn(),
    }),
);

vi.mock(
    '../../modules/usageMetric/usageMetric.service.js',
    () => ({
        reserveUsageMetricWithinLimit: vi.fn(),
    }),
);

describe('evaluatePlanLimit', () => {
    it('autorise une consommation qui reste dans la limite', () => {
        const result = evaluatePlanLimit({
            limit: 10,
            currentValue: 7,
            amount: 2,
        });

        expect(result).toEqual({
            allowed: true,
            unlimited: false,
            limit: 10,
            currentValue: 7,
            requestedAmount: 2,
            nextValue: 9,
            remaining: 1,
        });
    });


    it('refuse une consommation qui dépasse la limite', () => {
        const result = evaluatePlanLimit({
            limit: 10,
            currentValue: 7,
            amount: 4,
        });

        expect(result).toEqual({
            allowed: false,
            unlimited: false,
            limit: 10,
            currentValue: 7,
            requestedAmount: 4,
            nextValue: 11,
            /*
             * La demande est refusée : la consommation reste à 7 et les
             * trois unités encore disponibles ne sont pas réservées.
             */
            remaining: 3,
        });
    });


    it('autorise une consommation lorsque la limite est illimitée', () => {
        const result = evaluatePlanLimit({
            limit: null,
            currentValue: 500,
            amount: 100,
        });

        expect(result).toEqual({
            allowed: true,
            unlimited: true,
            limit: null,
            currentValue: 500,
            requestedAmount: 100,
            nextValue: 600,
            remaining: null,
        });
    });
});

describe('resolvePlanMetricLimit', () => {
    it('retourne la limite numérique configurée dans le plan', () => {
        const plan = {
            limits: new Map([
                ['members', 5],
            ]),
        };

        const result = resolvePlanMetricLimit({
            plan,
            metricKey: 'members',
        });

        expect(result).toBe(5);
    });


    it('conserve null comme limite explicitement illimitée', () => {
        const plan = {
            limits: new Map([
                ['storage_bytes', null],
            ]),
        };

        const result = resolvePlanMetricLimit({
            plan,
            metricKey: 'storage_bytes',
        });

        expect(result).toBeNull();
    });


    it('refuse une métrique déclarée mais absente des limites du plan', () => {
        const plan = {
            limits: new Map(),
        };

        expect(() => {
            resolvePlanMetricLimit({
                plan,
                metricKey: 'members',
            });
        }).toThrow(
            'La limite members n’est pas configurée dans le plan.',
        );
    });
});

describe('enforcePlanLimit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('résout le plan puis réserve la consommation autorisée', async () => {
        const workspaceId = 'workspace-id';
        const actorId = 'actor-id';
        const at = new Date('2026-08-17T12:00:00.000Z');

        const subscription = {
            _id: 'subscription-id',
        };

        const plan = {
            _id: 'plan-id',
            limits: new Map([
                ['members', 5],
            ]),
        };

        const usageMetric = {
            metricKey: 'members',
            value: 4,
        };

        getWorkspacePlanEntitlement.mockResolvedValue({
            subscription,
            plan,
        });

        reserveUsageMetricWithinLimit.mockResolvedValue(
            usageMetric,
        );

        const result = await enforcePlanLimit({
            workspaceId,
            metricKey: 'members',
            amount: 1,
            at,
            actorId,
        });

        expect(
            getWorkspacePlanEntitlement,
        ).toHaveBeenCalledWith({
            workspaceId,
            session: null,
        });

        expect(
            reserveUsageMetricWithinLimit,
        ).toHaveBeenCalledWith({
            workspaceId,
            metricKey: 'members',
            limit: 5,
            amount: 1,
            at,
            actorId,
            registry: expect.any(Object),
            session: null,
        });

        expect(result).toEqual({
            subscription,
            plan,
            usageMetric,
            metricKey: 'members',
            limit: 5,
        });
    });


    it('refuse la demande lorsque la réservation atomique échoue', async () => {
        const plan = {
            _id: 'plan-id',
            limits: new Map([
                ['members', 5],
            ]),
        };

        getWorkspacePlanEntitlement.mockResolvedValue({
            subscription: {
                _id: 'subscription-id',
            },
            plan,
        });

        /*
         * null signifie que la condition atomique n'a trouvé aucune capacité
         * suffisante au moment exact de la réservation.
         */
        reserveUsageMetricWithinLimit.mockResolvedValue(
            null,
        );

        const error = await enforcePlanLimit({
            workspaceId: 'workspace-id',
            metricKey: 'members',
            amount: 1,
        }).catch(
            (caughtError) => caughtError,
        );

        expect(error).toBeInstanceOf(
            PlanLimitExceededError,
        );

        expect(error).toMatchObject({
            name: 'PlanLimitExceededError',
            message:
                'La limite members du plan est atteinte.',
            statusCode: 403,
            metricKey: 'members',
        });
    });
});
describe('reservePlanLimitForEntitlement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('réserve une limite depuis un entitlement déjà résolu', async () => {
        const workspaceId = 'workspace-id';
        const actorId = 'actor-id';

        const at =
            new Date(
                '2026-08-19T10:00:00.000Z',
            );

        const session = {
            id: 'mongo-session',
        };

        const planEntitlement = {
            subscription: {
                _id: 'subscription-id',
            },
            plan: {
                _id: 'plan-id',
                limits: new Map([
                    [
                        'file_uploads_monthly',
                        10,
                    ],
                ]),
            },
        };

        const usageMetric = {
            metricKey:
                'file_uploads_monthly',
            value: 4,
        };

        reserveUsageMetricWithinLimit
            .mockResolvedValue(
                usageMetric,
            );

        const result =
            await reservePlanLimitForEntitlement({
                workspaceId,
                planEntitlement,
                metricKey:
                    'file_uploads_monthly',
                amount: 1,
                at,
                actorId,
                session,
            });

        /*
         * L'entitlement fourni doit être utilisé directement. Aucune seconde
         * lecture Subscription n'est autorisée dans cette variante.
         */
        expect(
            getWorkspacePlanEntitlement,
        ).not.toHaveBeenCalled();

        expect(
            reserveUsageMetricWithinLimit,
        ).toHaveBeenCalledWith({
            workspaceId,
            metricKey:
                'file_uploads_monthly',
            limit: 10,
            amount: 1,
            at,
            actorId,
            registry: expect.any(Object),
            session,
        });

        expect(result).toEqual({
            subscription:
                planEntitlement.subscription,
            plan:
                planEntitlement.plan,
            usageMetric,
            metricKey:
                'file_uploads_monthly',
            limit: 10,
        });
    });


    it('refuse un entitlement incomplet avant toute réservation', async () => {
        await expect(
            reservePlanLimitForEntitlement({
                workspaceId:
                    'workspace-id',
                planEntitlement: {
                    subscription: {
                        _id:
                            'subscription-id',
                    },
                    plan: null,
                },
                metricKey:
                    'file_uploads_monthly',
            }),
        ).rejects.toThrow(
            'A valid plan entitlement is required to reserve a plan limit',
        );

        expect(
            reserveUsageMetricWithinLimit,
        ).not.toHaveBeenCalled();
    });
});