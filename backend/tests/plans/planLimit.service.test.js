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
    reserveEffectiveLimitForEntitlement,
    reservePlanLimitForEntitlement,
    resolveEffectiveMetricLimit,
    resolvePlanMetricLimit,
} from '../../modules/plan/planLimit.service.js';
import {
    getWorkspaceEffectiveEntitlement,
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
        getWorkspaceEffectiveEntitlement: vi.fn(),
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

        expect(resolvePlanMetricLimit({
            plan,
            metricKey: 'members',
        })).toBe(5);
    });

    it('conserve null comme limite catalogue explicitement illimitée', () => {
        const plan = {
            limits: new Map([
                ['storage_bytes', null],
            ]),
        };

        expect(resolvePlanMetricLimit({
            plan,
            metricKey: 'storage_bytes',
        })).toBeNull();
    });

    it('refuse une métrique déclarée mais absente des limites du plan', () => {
        expect(() => resolvePlanMetricLimit({
            plan: {
                limits: new Map(),
            },
            metricKey: 'members',
        })).toThrow(
            'La limite members n’est pas configurée dans le plan.',
        );
    });
});

describe('resolveEffectiveMetricLimit', () => {
    it('retourne la valeur résultant de la composition des overrides', () => {
        const entitlement = {
            effectiveCapabilities: {
                limits: {
                    members: 12,
                    storage_bytes: null,
                },
            },
        };

        expect(resolveEffectiveMetricLimit({
            entitlement,
            metricKey: 'members',
        })).toBe(12);

        expect(resolveEffectiveMetricLimit({
            entitlement,
            metricKey: 'storage_bytes',
        })).toBeNull();
    });

    it('refuse une métrique effective absente au lieu de la considérer illimitée', () => {
        expect(() => resolveEffectiveMetricLimit({
            entitlement: {
                effectiveCapabilities: {
                    limits: {},
                },
            },
            metricKey: 'members',
        })).toThrow(
            'La limite effective members n’est pas configurée pour le workspace.',
        );
    });
});

describe('enforcePlanLimit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('résout l’entitlement effectif puis réserve avec sa limite finale', async () => {
        const workspaceId = 'workspace-id';
        const actorId = 'actor-id';
        const at = new Date('2026-09-03T12:00:00.000Z');
        const subscription = {
            _id: 'subscription-id',
        };
        const plan = {
            _id: 'plan-id',
            limits: new Map([
                ['members', 5],
            ]),
        };
        const effectiveCapabilities = {
            features: [],
            limits: {
                members: 12,
            },
            appliedOverrides: [
                {
                    id: 'override-id',
                    metricKey: 'members',
                    limitValue: 12,
                },
            ],
        };
        const usageMetric = {
            metricKey: 'members',
            value: 6,
        };

        getWorkspaceEffectiveEntitlement.mockResolvedValue({
            subscription,
            plan,
            effectiveCapabilities,
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
            getWorkspaceEffectiveEntitlement,
        ).toHaveBeenCalledWith({
            workspaceId,
            at,
            registry: expect.any(Object),
            session: null,
        });

        expect(
            reserveUsageMetricWithinLimit,
        ).toHaveBeenCalledWith({
            workspaceId,
            metricKey: 'members',
            limit: 12,
            amount: 1,
            at,
            actorId,
            registry: expect.any(Object),
            session: null,
        });

        expect(result).toEqual({
            subscription,
            plan,
            effectiveCapabilities,
            usageMetric,
            metricKey: 'members',
            limit: 12,
        });
    });

    it('refuse la demande lorsque la réservation atomique de la limite effective échoue', async () => {
        getWorkspaceEffectiveEntitlement.mockResolvedValue({
            subscription: {
                _id: 'subscription-id',
            },
            plan: {
                _id: 'plan-id',
            },
            effectiveCapabilities: {
                features: [],
                limits: {
                    members: 3,
                },
                appliedOverrides: [],
            },
        });

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
                'La limite members du workspace est atteinte.',
            statusCode: 403,
            metricKey: 'members',
        });
    });
});

describe('reserveEffectiveLimitForEntitlement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('utilise directement une limite effective dans la même session', async () => {
        const at = new Date('2026-09-03T12:00:00.000Z');
        const session = {
            id: 'mongo-session',
        };
        const effectiveEntitlement = {
            subscription: {
                _id: 'subscription-id',
            },
            plan: {
                _id: 'plan-id',
            },
            effectiveCapabilities: {
                features: [],
                limits: {
                    file_uploads_monthly: 25,
                },
                appliedOverrides: [],
            },
        };
        const usageMetric = {
            metricKey: 'file_uploads_monthly',
            value: 4,
        };

        reserveUsageMetricWithinLimit
            .mockResolvedValue(usageMetric);

        const result =
            await reserveEffectiveLimitForEntitlement({
                workspaceId: 'workspace-id',
                effectiveEntitlement,
                metricKey: 'file_uploads_monthly',
                amount: 1,
                at,
                actorId: 'actor-id',
                session,
            });

        expect(
            getWorkspaceEffectiveEntitlement,
        ).not.toHaveBeenCalled();

        expect(
            reserveUsageMetricWithinLimit,
        ).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            metricKey: 'file_uploads_monthly',
            limit: 25,
            amount: 1,
            at,
            actorId: 'actor-id',
            registry: expect.any(Object),
            session,
        });

        expect(result.limit).toBe(25);
        expect(result.effectiveCapabilities)
            .toBe(effectiveEntitlement.effectiveCapabilities);
    });
});

describe('reservePlanLimitForEntitlement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('conserve la primitive Plan-only pour les opérations de catalogue', async () => {
        const at = new Date('2026-08-19T10:00:00.000Z');
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
                    ['file_uploads_monthly', 10],
                ]),
            },
        };
        const usageMetric = {
            metricKey: 'file_uploads_monthly',
            value: 4,
        };

        reserveUsageMetricWithinLimit
            .mockResolvedValue(usageMetric);

        const result =
            await reservePlanLimitForEntitlement({
                workspaceId: 'workspace-id',
                planEntitlement,
                metricKey: 'file_uploads_monthly',
                amount: 1,
                at,
                actorId: 'actor-id',
                session,
            });

        expect(
            getWorkspaceEffectiveEntitlement,
        ).not.toHaveBeenCalled();

        expect(result.limit).toBe(10);
    });

    it('refuse un entitlement Plan incomplet avant toute réservation', async () => {
        await expect(
            reservePlanLimitForEntitlement({
                workspaceId: 'workspace-id',
                planEntitlement: {
                    subscription: {
                        _id: 'subscription-id',
                    },
                    plan: null,
                },
                metricKey: 'file_uploads_monthly',
            }),
        ).rejects.toThrow(
            'A valid plan entitlement is required to reserve a plan limit',
        );

        expect(
            reserveUsageMetricWithinLimit,
        ).not.toHaveBeenCalled();
    });
});