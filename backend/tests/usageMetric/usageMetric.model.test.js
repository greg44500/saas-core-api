import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';

import {
    UsageMetric,
} from '../../modules/usageMetric/usageMetric.model.js';


describe('UsageMetric model', () => {
    const workspaceId = new mongoose.Types.ObjectId();


    it('valide une métrique représentant un état courant', () => {
        const usageMetric = new UsageMetric({
            workspace: workspaceId,
            metricKey: 'members',
            value: 1,
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        });

        const validationError = usageMetric.validateSync();

        expect(validationError).toBeUndefined();

        expect(usageMetric.periodStart).toBeNull();
        expect(usageMetric.periodEnd).toBeNull();
    });


    it('valide une métrique associée à un mois civil', () => {
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

        const validationError = usageMetric.validateSync();

        expect(validationError).toBeUndefined();

        expect(usageMetric.periodStart).toEqual(periodStart);
        expect(usageMetric.periodEnd).toEqual(periodEnd);
    });


    it('rejette une valeur négative ou non entière', () => {
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

        expect(
            negativeMetric.validateSync()?.errors.value,
        ).toBeDefined();

        expect(
            decimalMetric.validateSync()?.errors.value,
        ).toBeDefined();
    });


    it('impose des bornes cohérentes avec le type de période', () => {
        /*
         * Une métrique mensuelle sans dates ne permettrait pas de savoir
         * à quel mois rattacher sa consommation.
         */
        const monthlyMetricWithoutPeriod = new UsageMetric({
            workspace: workspaceId,
            metricKey: 'file_uploads_monthly',
            value: 1,
            periodType:
                USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
        });

        const missingPeriodError =
            monthlyMetricWithoutPeriod.validateSync();

        expect(
            missingPeriodError?.errors.periodStart,
        ).toBeDefined();

        expect(
            missingPeriodError?.errors.periodEnd,
        ).toBeDefined();


        /*
         * Une métrique courante ne doit posséder aucune borne temporelle,
         * car elle représente toujours l'état actuel du workspace.
         */
        const currentMetricWithPeriod = new UsageMetric({
            workspace: workspaceId,
            metricKey: 'members',
            value: 1,
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
            periodStart:
                new Date('2026-08-01T00:00:00.000Z'),
            periodEnd:
                new Date('2026-09-01T00:00:00.000Z'),
        });

        const unexpectedPeriodError =
            currentMetricWithPeriod.validateSync();

        expect(
            unexpectedPeriodError?.errors.periodStart,
        ).toBeDefined();

        expect(
            unexpectedPeriodError?.errors.periodEnd,
        ).toBeDefined();


        /*
         * La borne finale doit toujours être postérieure à la borne initiale.
         */
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

        expect(
            monthlyMetricWithInvalidPeriod
                .validateSync()
                ?.errors.periodEnd,
        ).toBeDefined();
    });
});