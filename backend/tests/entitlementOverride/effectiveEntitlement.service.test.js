import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    composeEffectiveEntitlementCapabilities,
} from '../../modules/entitlementOverride/effectiveEntitlement.service.js';
import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';


const createActiveOverrides = ({
    features = {},
    limits = {},
    overrides = [],
} = {}) => ({
    at: new Date('2026-09-03T12:00:00.000Z'),
    features,
    limits,
    overrides,
});


describe('composeEffectiveEntitlementCapabilities', () => {
    it('active et restreint des features sans modifier le Plan catalogue', () => {
        const plan = {
            features: ['file_upload', 'team_management'],
            limits: new Map([
                ['members', 5],
                ['storage_bytes', 1_000],
            ]),
        };
        const originalFeatures = [...plan.features];
        const originalLimits = new Map(plan.limits);

        const result = composeEffectiveEntitlementCapabilities({
            plan,
            activeOverrides: createActiveOverrides({
                features: {
                    audit_logs: true,
                    team_management: false,
                },
            }),
        });

        expect(result.features).toEqual([
            'audit_logs',
            'file_upload',
        ]);

        expect(plan.features).toEqual(originalFeatures);
        expect(plan.limits).toEqual(originalLimits);
    });

    it('remplace les limites catalogue et conserve null comme illimité', () => {
        const result = composeEffectiveEntitlementCapabilities({
            plan: {
                features: [],
                limits: new Map([
                    ['members', 5],
                    ['storage_bytes', 1_000],
                ]),
            },
            activeOverrides: createActiveOverrides({
                limits: {
                    members: 12,
                    storage_bytes: null,
                },
            }),
        });

        expect(result.limits).toEqual({
            members: 12,
            storage_bytes: null,
        });
    });

    it('supporte les capabilities métier du registre injecté', () => {
        const registry = createPlanCapabilityRegistry({
            features: ['price_history'],
            metricDefinitions: {
                products: {
                    periodType: 'current',
                    behavior: 'capacity',
                    remediationRequired: true,
                },
            },
        });

        const result = composeEffectiveEntitlementCapabilities({
            plan: {
                features: [],
                limits: {
                    products: 100,
                },
            },
            activeOverrides: createActiveOverrides({
                features: {
                    price_history: true,
                },
                limits: {
                    products: 250,
                },
            }),
            registry,
        });

        expect(result.features).toEqual(['price_history']);
        expect(result.limits.products).toBe(250);
    });

    it('copie les overrides appliqués pour ne pas exposer le tableau source à une mutation', () => {
        const sourceOverride = {
            id: 'override-1',
            featureKey: 'audit_logs',
            featureEnabled: true,
        };
        const activeOverrides = createActiveOverrides({
            features: {
                audit_logs: true,
            },
            overrides: [sourceOverride],
        });

        const result = composeEffectiveEntitlementCapabilities({
            plan: {
                features: [],
                limits: {},
            },
            activeOverrides,
        });

        expect(result.appliedOverrides).toEqual([sourceOverride]);
        expect(result.appliedOverrides).not.toBe(activeOverrides.overrides);
        expect(result.appliedOverrides[0]).not.toBe(sourceOverride);
    });

    it('refuse une capability persistée du Plan absente du registre actif', () => {
        expect(() => composeEffectiveEntitlementCapabilities({
            plan: {
                features: ['unknown_feature'],
                limits: {},
            },
            activeOverrides: createActiveOverrides(),
        })).toThrow(
            'Unknown plan feature in effective entitlement: "unknown_feature"',
        );

        expect(() => composeEffectiveEntitlementCapabilities({
            plan: {
                features: [],
                limits: {
                    unknown_metric: 10,
                },
            },
            activeOverrides: createActiveOverrides(),
        })).toThrow(
            'Unknown plan metric in effective entitlement: "unknown_metric"',
        );
    });

    it('refuse une valeur d’override incohérente même à cette frontière interne', () => {
        expect(() => composeEffectiveEntitlementCapabilities({
            plan: {
                features: [],
                limits: {},
            },
            activeOverrides: createActiveOverrides({
                features: {
                    audit_logs: 'yes',
                },
            }),
        })).toThrow(
            'Invalid override feature state in effective entitlement: "audit_logs"',
        );

        expect(() => composeEffectiveEntitlementCapabilities({
            plan: {
                features: [],
                limits: {},
            },
            activeOverrides: createActiveOverrides({
                limits: {
                    members: -1,
                },
            }),
        })).toThrow(
            'Invalid override limit in effective entitlement: "members"',
        );
    });

    it('refuse une forme de registre ou de résolution interne invalide', () => {
        expect(() => composeEffectiveEntitlementCapabilities({
            plan: {
                features: [],
                limits: {},
            },
            activeOverrides: createActiveOverrides(),
            registry: {},
        })).toThrow(
            'registry must expose features and metrics sets',
        );

        expect(() => composeEffectiveEntitlementCapabilities({
            plan: {
                features: [],
                limits: {},
            },
            activeOverrides: {
                features: {},
                limits: {},
            },
        })).toThrow(
            'activeOverrides has an invalid resolution shape',
        );
    });
});
