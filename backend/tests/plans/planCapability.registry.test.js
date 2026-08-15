import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    CORE_PLAN_FEATURES,
    CORE_PLAN_METRICS,
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';


describe('Plan capability registry', () => {
    it('contient les features et métriques du socle dans le registre par défaut', () => {
        for (const feature of CORE_PLAN_FEATURES) {
            expect(
                DEFAULT_PLAN_CAPABILITY_REGISTRY.features.has(feature),
            ).toBe(true);
        }

        for (const metric of CORE_PLAN_METRICS) {
            expect(
                DEFAULT_PLAN_CAPABILITY_REGISTRY.metrics.has(metric),
            ).toBe(true);
        }
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
        expect(registry.features.has('dpe_monitoring')).toBe(true);

        expect(registry.metrics.has('members')).toBe(true);
        expect(registry.metrics.has('properties')).toBe(true);
        expect(
            registry.metrics.has('dpe_checks_monthly'),
        ).toBe(true);
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
});