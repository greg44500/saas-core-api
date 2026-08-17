import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';

import {
    UsageMetric,
} from '../../modules/usageMetric/usageMetric.model.js';


/**
 * Exécute la validation asynchrone recommandée par Mongoose et retourne
 * l'éventuelle erreur afin de pouvoir inspecter précisément ses champs.
 */
const getValidationError = async (document) => {
    try {
        await document.validate();

        return undefined;
    } catch (error) {
        return error;
    }
};


describe('UsageMetric model', () => {
    const workspaceId = new mongoose.Types.ObjectId();


    it('valide une métrique représentant un état courant', async () => {
        const usageMetric = new UsageMetric({
            workspace: workspaceId,
            metricKey: 'members',
            value: 1,
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        });

        const validationError =
            await getValidationError(usageMetric);

        expect(validationError).toBeUndefined();
        expect(usageMetric.periodStart).toBeNull();
        expect(usageMetric.periodEnd).toBeNull();
    });


    it('valide une métrique associée à un mois civil', async () => {
        const periodStart =
            new Date('2026-08-01T00:00:00.000Z');

        const periodEnd =
            new Date('2026-09-01T00:00:00.000Z');

        const usageMetric = new UsageMetric({
            workspace: workspaceId,
            metricKey: 'file_uploads_monthly',
            value: 7,
            periodType:
                USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
            periodStart,
            periodEnd,
        });

        const validationError =
            await getValidationError(usageMetric);

        expect(validationError).toBeUndefined();
        expect(usageMetric.periodStart).toEqual(periodStart);
        expect(usageMetric.periodEnd).toEqual(periodEnd);
    });


    it('rejette une valeur négative ou non entière', async () => {
        const negativeMetric = new UsageMetric({
            workspace: workspaceId,
            metricKey: 'storage_bytes',
            value: -1,
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        });

        const decimalMetric = new UsageMetric({
            workspace: workspaceId,
            metricKey: 'storage_bytes',
            value: 10.5,
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        });

        const [
            negativeValidationError,
            decimalValidationError,
        ] = await Promise.all([
            getValidationError(negativeMetric),
            getValidationError(decimalMetric),
        ]);

        expect(
            negativeValidationError?.errors.value,
        ).toBeDefined();

        expect(
            decimalValidationError?.errors.value,
        ).toBeDefined();
    });


    it('impose des bornes cohérentes avec le type de période', async () => {
        const monthlyMetricWithoutPeriod =
            new UsageMetric({
                workspace: workspaceId,
                metricKey: 'file_uploads_monthly',
                value: 1,
                periodType:
                    USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
            });

        const missingPeriodError =
            await getValidationError(
                monthlyMetricWithoutPeriod,
            );

        expect(
            missingPeriodError?.errors.periodStart,
        ).toBeDefined();

        expect(
            missingPeriodError?.errors.periodEnd,
        ).toBeDefined();


        const currentMetricWithPeriod =
            new UsageMetric({
                workspace: workspaceId,
                metricKey: 'members',
                value: 1,
                periodType:
                    USAGE_METRIC_PERIOD_TYPE.CURRENT,
                periodStart:
                    new Date('2026-08-01T00:00:00.000Z'),
                periodEnd:
                    new Date('2026-09-01T00:00:00.000Z'),
            });

        const unexpectedPeriodError =
            await getValidationError(
                currentMetricWithPeriod,
            );

        expect(
            unexpectedPeriodError?.errors.periodStart,
        ).toBeDefined();

        expect(
            unexpectedPeriodError?.errors.periodEnd,
        ).toBeDefined();


        const monthlyMetricWithInvalidPeriod =
            new UsageMetric({
                workspace: workspaceId,
                metricKey: 'file_uploads_monthly',
                value: 1,
                periodType:
                    USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
                periodStart:
                    new Date('2026-09-01T00:00:00.000Z'),
                periodEnd:
                    new Date('2026-08-01T00:00:00.000Z'),
            });

        const invalidPeriodError =
            await getValidationError(
                monthlyMetricWithInvalidPeriod,
            );

        expect(
            invalidPeriodError?.errors.periodEnd,
        ).toBeDefined();
    });
});