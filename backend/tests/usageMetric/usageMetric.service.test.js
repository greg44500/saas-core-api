import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';

import {
    UsageMetric,
} from '../../modules/usageMetric/usageMetric.model.js';

import {
    getUsageMetricValue,
    incrementUsageMetric,
    resolveUsageMetricPeriod,
} from '../../modules/usageMetric/usageMetric.service.js';


vi.mock(
    '../../modules/usageMetric/usageMetric.model.js',
    () => ({
        UsageMetric: {
            findOne: vi.fn(),
            findOneAndUpdate: vi.fn(),
        },
    }),
);


describe('resolveUsageMetricPeriod', () => {
    it('retourne une période sans bornes pour une métrique courante', () => {
        const result = resolveUsageMetricPeriod({
            metricKey: 'members',
            at: new Date('2026-08-16T12:00:00.000Z'),
        });

        expect(result).toEqual({
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
            periodStart: null,
            periodEnd: null,
        });
    });


    it('calcule les bornes UTC du mois civil', () => {
        /*
         * Décembre vérifie également le passage automatique vers
         * janvier de l'année suivante.
         */
        const result = resolveUsageMetricPeriod({
            metricKey: 'file_uploads_monthly',
            at: new Date('2026-12-16T23:30:00.000Z'),
        });

        expect(result).toEqual({
            periodType:
                USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
            periodStart:
                new Date('2026-12-01T00:00:00.000Z'),
            periodEnd:
                new Date('2027-01-01T00:00:00.000Z'),
        });
    });


    it('rejette une métrique sans définition temporelle', () => {
        expect(() =>
            resolveUsageMetricPeriod({
                metricKey: 'unknown_metric',
                at: new Date('2026-08-16T12:00:00.000Z'),
            }),
        ).toThrow(
            'No usage metric definition found for "unknown_metric"',
        );
    });
});


describe('getUsageMetricValue', () => {
    let query;

    beforeEach(() => {
        vi.clearAllMocks();

        /*
         * Simule la chaîne Mongoose :
         * findOne → select → session éventuelle → lean.
         */
        query = {
            select: vi.fn(),
            session: vi.fn(),
            lean: vi.fn(),
        };

        query.select.mockReturnValue(query);
        query.session.mockReturnValue(query);

        UsageMetric.findOne.mockReturnValue(query);
    });


    it('retourne la consommation de la période recherchée', async () => {
        const workspaceId = 'workspace-id';
        const session = {
            id: 'mongo-session',
        };

        query.lean.mockResolvedValue({
            value: 7,
        });

        const result = await getUsageMetricValue({
            workspaceId,
            metricKey: 'file_uploads_monthly',
            at: new Date('2026-08-16T12:00:00.000Z'),
            session,
        });

        expect(UsageMetric.findOne).toHaveBeenCalledWith({
            workspace: workspaceId,
            metricKey: 'file_uploads_monthly',
            periodType:
                USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
            periodStart:
                new Date('2026-08-01T00:00:00.000Z'),
        });

        expect(query.select).toHaveBeenCalledWith('value');
        expect(query.session).toHaveBeenCalledWith(session);
        expect(query.lean).toHaveBeenCalledOnce();

        expect(result).toBe(7);
    });


    it('retourne zéro lorsqu’aucune consommation n’existe', async () => {
        query.lean.mockResolvedValue(null);

        const result = await getUsageMetricValue({
            workspaceId: 'workspace-id',
            metricKey: 'members',
            at: new Date('2026-08-16T12:00:00.000Z'),
        });

        expect(UsageMetric.findOne).toHaveBeenCalledWith({
            workspace: 'workspace-id',
            metricKey: 'members',
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
            periodStart: null,
        });

        /*
         * Aucune transaction n'a été transmise : le service ne doit donc pas
         * ajouter artificiellement une session à la requête.
         */
        expect(query.session).not.toHaveBeenCalled();
        expect(result).toBe(0);
    });
});

describe('incrementUsageMetric', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('incrémente atomiquement la métrique de la période', async () => {
        const workspaceId = 'workspace-id';
        const actorId = 'actor-id';
        const session = {
            id: 'mongo-session',
        };

        const updatedUsageMetric = {
            workspace: workspaceId,
            metricKey: 'file_uploads_monthly',
            value: 8,
        };

        UsageMetric.findOneAndUpdate.mockResolvedValue(
            updatedUsageMetric,
        );

        const result = await incrementUsageMetric({
            workspaceId,
            metricKey: 'file_uploads_monthly',
            amount: 3,
            at: new Date('2026-08-16T12:00:00.000Z'),
            actorId,
            session,
        });

        const periodStart =
            new Date('2026-08-01T00:00:00.000Z');

        const periodEnd =
            new Date('2026-09-01T00:00:00.000Z');

        expect(
            UsageMetric.findOneAndUpdate,
        ).toHaveBeenCalledWith(
            {
                workspace: workspaceId,
                metricKey: 'file_uploads_monthly',
                periodType:
                    USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
                periodStart,
            },
            {
                $inc: {
                    value: 3,
                },
                $set: {
                    updatedBy: actorId,
                },
                $setOnInsert: {
                    workspace: workspaceId,
                    metricKey: 'file_uploads_monthly',
                    periodType:
                        USAGE_METRIC_PERIOD_TYPE
                            .CALENDAR_MONTH,
                    periodStart,
                    periodEnd,
                    createdBy: actorId,
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
                runValidators: true,
                setDefaultsOnInsert: true,
                session,
            },
        );

        expect(result).toBe(updatedUsageMetric);
    });


    it('rejette un incrément nul, négatif ou non entier', async () => {
        const invalidAmounts = [
            0,
            -1,
            1.5,
        ];

        for (const amount of invalidAmounts) {
            await expect(
                incrementUsageMetric({
                    workspaceId: 'workspace-id',
                    metricKey: 'members',
                    amount,
                }),
            ).rejects.toThrow(
                'amount must be an integer greater than 0',
            );
        }

        /*
         * Une entrée invalide doit être rejetée avant toute requête MongoDB.
         */
        expect(
            UsageMetric.findOneAndUpdate,
        ).not.toHaveBeenCalled();
    });
});