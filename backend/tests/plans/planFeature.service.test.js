import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';

import {
    assertPlanFeatureAvailable,
} from '../../modules/plan/planFeature.service.js';


describe('assertPlanFeatureAvailable', () => {
    it('autorise une fonctionnalité incluse dans le plan', () => {
        expect(
            assertPlanFeatureAvailable({
                plan: {
                    features: [
                        'file_upload',
                    ],
                },
                featureKey: 'file_upload',
            }),
        ).toBe(true);
    });


    it('refuse une fonctionnalité valide mais absente du plan', () => {
        expect(() => {
            assertPlanFeatureAvailable({
                plan: {
                    features: [
                        'team_management',
                    ],
                },
                featureKey: 'file_upload',
            });
        }).toThrow(
            'Cette fonctionnalité n’est pas incluse dans le plan du workspace.',
        );

        try {
            assertPlanFeatureAvailable({
                plan: {
                    features: [],
                },
                featureKey: 'file_upload',
            });
        } catch (error) {
            expect(error.statusCode).toBe(403);
        }
    });


    it('refuse un plan dont les fonctionnalités sont invalides', () => {
        expect(() => {
            assertPlanFeatureAvailable({
                plan: {
                    features: null,
                },
                featureKey: 'file_upload',
            });
        }).toThrow(
            'Les fonctionnalités du plan sont indisponibles.',
        );

        try {
            assertPlanFeatureAvailable({
                plan: {
                    features: null,
                },
                featureKey: 'file_upload',
            });
        } catch (error) {
            expect(error.statusCode).toBe(500);
        }
    });


    it('refuse une fonctionnalité inconnue du registre', () => {
        expect(() => {
            assertPlanFeatureAvailable({
                plan: {
                    features: [
                        'unknown_feature',
                    ],
                },
                featureKey:
                    'unknown_feature',
            });
        }).toThrow(
            'Unknown plan feature "unknown_feature"',
        );
    });


    it('accepte une fonctionnalité déclarée par une application métier', () => {
        const registry =
            createPlanCapabilityRegistry({
                features: [
                    'knowledge_base',
                ],
            });

        expect(
            assertPlanFeatureAvailable({
                plan: {
                    features: [
                        'knowledge_base',
                    ],
                },
                featureKey:
                    'knowledge_base',
                registry,
            }),
        ).toBe(true);
    });
});