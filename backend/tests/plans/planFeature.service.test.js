import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';

import {
    assertEntitlementFeatureAvailable,
    assertPlanFeatureAvailable,
} from '../../modules/plan/planFeature.service.js';


const createEffectiveEntitlement = ({
    features = [],
} = {}) => ({
    effectiveCapabilities: {
        features,
        limits: {},
        appliedOverrides: [],
    },
});


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


describe('assertEntitlementFeatureAvailable', () => {
    it('autorise une feature présente dans l’entitlement effectif', () => {
        expect(
            assertEntitlementFeatureAvailable({
                entitlement: createEffectiveEntitlement({
                    features: ['file_upload'],
                }),
                featureKey: 'file_upload',
            }),
        ).toBe(true);
    });

    it('refuse une feature retirée de l’entitlement même si le Plan pourrait la contenir', () => {
        expect(() =>
            assertEntitlementFeatureAvailable({
                entitlement: createEffectiveEntitlement(),
                featureKey: 'file_upload',
            }),
        ).toThrow(
            'Cette fonctionnalité n’est pas disponible pour ce workspace.',
        );
    });

    it('supporte une feature métier ajoutée par le registre applicatif', () => {
        const registry = createPlanCapabilityRegistry({
            features: ['price_history'],
        });

        expect(
            assertEntitlementFeatureAvailable({
                entitlement: createEffectiveEntitlement({
                    features: ['price_history'],
                }),
                featureKey: 'price_history',
                registry,
            }),
        ).toBe(true);
    });

    it('refuse une forme d’entitlement invalide plutôt que de retomber sur le Plan', () => {
        expect(() =>
            assertEntitlementFeatureAvailable({
                entitlement: {
                    effectiveCapabilities: {
                        features: null,
                    },
                },
                featureKey: 'file_upload',
            }),
        ).toThrow(
            'Les fonctionnalités effectives du workspace sont indisponibles.',
        );
    });
});