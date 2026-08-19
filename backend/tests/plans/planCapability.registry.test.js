import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';

import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_FEATURES,
    CORE_PLAN_METRICS,
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';


describe('Plan capability registry', () => {
    it('contient les features et métriques du socle dans le registre par défaut', () => {
        for (const feature of CORE_PLAN_FEATURES) {
            expect(
                DEFAULT_PLAN_CAPABILITY_REGISTRY.features.has(
                    feature,
                ),
            ).toBe(true);
        }

        for (const metric of CORE_PLAN_METRICS) {
            expect(
                DEFAULT_PLAN_CAPABILITY_REGISTRY.metrics.has(
                    metric,
                ),
            ).toBe(true);
        }
    });


    it('associe chaque métrique du socle à sa période de mesure', () => {
        expect(
            DEFAULT_PLAN_CAPABILITY_REGISTRY
                .getMetricDefinition('members'),
        ).toEqual({
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        });

        expect(
            DEFAULT_PLAN_CAPABILITY_REGISTRY
                .getMetricDefinition('storage_bytes'),
        ).toEqual({
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        });

        expect(
            DEFAULT_PLAN_CAPABILITY_REGISTRY
                .getMetricDefinition(
                    'file_uploads_monthly',
                ),
        ).toEqual({
            periodType:
                USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
        });
    });


    it('permet d’ajouter des capabilities métier sans modifier celles du socle', () => {
        const registry = createPlanCapabilityRegistry({
            features: [
                'dpe_monitoring',
            ],
            metrics: [
                'properties',
                'dpe_checks_monthly',
            ],
        });

        expect(registry.features.has('file_upload')).toBe(true);
        expect(
            registry.features.has('dpe_monitoring'),
        ).toBe(true);

        expect(registry.metrics.has('members')).toBe(true);
        expect(registry.metrics.has('properties')).toBe(true);
        expect(
            registry.metrics.has('dpe_checks_monthly'),
        ).toBe(true);
    });


    it('enregistre une définition temporelle injectée par une application métier', () => {
        const registry = createPlanCapabilityRegistry({
            metricDefinitions: {
                properties: {
                    periodType:
                        USAGE_METRIC_PERIOD_TYPE.CURRENT,
                },

                dpe_checks_monthly: {
                    periodType:
                        USAGE_METRIC_PERIOD_TYPE
                            .CALENDAR_MONTH,
                },
            },
        });

        /*
         * Une clé définie dans metricDefinitions est automatiquement déclarée
         * comme métrique disponible dans le registre.
         */
        expect(
            registry.metrics.has('properties'),
        ).toBe(true);

        expect(
            registry.metrics.has('dpe_checks_monthly'),
        ).toBe(true);

        expect(
            registry.getMetricDefinition('properties'),
        ).toEqual({
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        });

        expect(
            registry.getMetricDefinition(
                'dpe_checks_monthly',
            ),
        ).toEqual({
            periodType:
                USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
        });

        expect(
            registry.getMetricDefinition('unknown_metric'),
        ).toBeNull();
    });


    it('élimine naturellement les doublons grâce aux Set', () => {
        const registry = createPlanCapabilityRegistry({
            features: [
                'file_upload',
                'file_upload',
            ],
            metrics: [
                'members',
                'members',
            ],
        });

        expect(
            [...registry.features].filter(
                (feature) => feature === 'file_upload',
            ),
        ).toHaveLength(1);

        expect(
            [...registry.metrics].filter(
                (metric) => metric === 'members',
            ),
        ).toHaveLength(1);
    });
    it('expose des clés nommées stables pour les fonctionnalités du socle', () => {
        expect(CORE_PLAN_FEATURE).toEqual({
            FILE_UPLOAD: 'file_upload',
            TEAM_MANAGEMENT: 'team_management',
            AUDIT_LOGS: 'audit_logs',
        });

        expect(CORE_PLAN_FEATURES).toEqual([
            'file_upload',
            'team_management',
            'audit_logs',
        ]);
    });
});