import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_RETENTION_TARGET_REGISTRY,
} from '../../config/applicationRetention.registry.js';
import {
    RETENTION_ACTION,
    RETENTION_CAPABILITY,
    RETENTION_TARGET,
    composeRetentionTargetExtensions,
    createRetentionTargetRegistry,
} from '../../modules/retention/retentionTarget.registry.js';


describe('retention target registry', () => {
    it('déclare AuditLog comme première cible Core code-owned', () => {
        const target =
            ACTIVE_RETENTION_TARGET_REGISTRY.getTargetDefinition(
                RETENTION_TARGET.AUDIT_LOG,
            );

        expect(target).toEqual(
            expect.objectContaining({
                key: RETENTION_TARGET.AUDIT_LOG,
                action: RETENTION_ACTION.DELETE,
            }),
        );
        expect(target.capabilities).toEqual(
            expect.arrayContaining([
                RETENTION_CAPABILITY.PREVIEW,
                RETENTION_CAPABILITY.SCHEDULED_EXECUTION,
                RETENTION_CAPABILITY.MANUAL_EXECUTION,
            ]),
        );
    });

    it('borne toutes les valeurs pilotables par une policy runtime', () => {
        const target =
            ACTIVE_RETENTION_TARGET_REGISTRY.getTargetDefinition(
                RETENTION_TARGET.AUDIT_LOG,
            );

        expect(target.bounds).toEqual({
            retentionDays: { min: 1, max: 36500 },
            batchSize: { min: 1, max: 500 },
            maxBatchesPerRun: { min: 1, max: 100 },
            scheduleIntervalMinutes: {
                min: 60,
                max: 525600,
            },
        });
    });

    it('compose explicitement une cible fournie par un SaaS dérivé', () => {
        const targets = composeRetentionTargetExtensions([
            {
                targets: [
                    {
                        key: 'business_event',
                        label: 'Événements métier',
                        description:
                            'Cible de test déclarée explicitement par le code.',
                        action: RETENTION_ACTION.DELETE,
                        capabilities: [
                            RETENTION_CAPABILITY.PREVIEW,
                        ],
                        bounds: {
                            retentionDays: { min: 1, max: 1000 },
                            batchSize: { min: 1, max: 100 },
                            maxBatchesPerRun: { min: 1, max: 10 },
                            scheduleIntervalMinutes: {
                                min: 60,
                                max: 10080,
                            },
                        },
                    },
                ],
            },
        ]);

        const registry = createRetentionTargetRegistry({ targets });

        expect(registry.hasTarget('business_event')).toBe(true);
    });

    it('refuse une cible dupliquée', () => {
        const coreTarget =
            ACTIVE_RETENTION_TARGET_REGISTRY.getTargetDefinition(
                RETENTION_TARGET.AUDIT_LOG,
            );

        expect(() => createRetentionTargetRegistry({
            targets: [coreTarget],
        })).toThrow(/Duplicate retention target/);
    });

    it('refuse une capacité inconnue ou une cible destructive sans preview', () => {
        const baseDefinition = {
            key: 'invalid_target',
            label: 'Cible invalide',
            description: 'Définition volontairement invalide.',
            action: RETENTION_ACTION.DELETE,
            capabilities: [RETENTION_CAPABILITY.PREVIEW],
            bounds: {
                retentionDays: { min: 1, max: 100 },
                batchSize: { min: 1, max: 10 },
                maxBatchesPerRun: { min: 1, max: 10 },
                scheduleIntervalMinutes: {
                    min: 60,
                    max: 1440,
                },
            },
        };

        expect(() => createRetentionTargetRegistry({
            targets: [{
                ...baseDefinition,
                capabilities: ['arbitrary_query'],
            }],
        })).toThrow(/invalid capability/);

        expect(() => createRetentionTargetRegistry({
            targets: [{
                ...baseDefinition,
                capabilities: [
                    RETENTION_CAPABILITY.MANUAL_EXECUTION,
                ],
            }],
        })).toThrow(/must support preview/);
    });

    it('refuse les champs techniques arbitraires dans une définition de cible', () => {
        expect(() => createRetentionTargetRegistry({
            targets: [
                {
                    key: 'unsafe_target',
                    label: 'Cible non sûre',
                    description: 'Définition volontairement invalide.',
                    action: RETENTION_ACTION.DELETE,
                    capabilities: [RETENTION_CAPABILITY.PREVIEW],
                    bounds: {
                        retentionDays: { min: 1, max: 100 },
                        batchSize: { min: 1, max: 10 },
                        maxBatchesPerRun: { min: 1, max: 10 },
                        scheduleIntervalMinutes: {
                            min: 60,
                            max: 1440,
                        },
                    },
                    collection: 'users',
                },
            ],
        })).toThrow(/unknown fields/);
    });
});
