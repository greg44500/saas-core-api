import { describe, expect, it } from 'vitest';

import {
    createRetentionPolicyVersionBodySchema,
    executeRetentionPolicyBodySchema,
    platformRetentionTargetParamsSchema,
} from '../../../modules/platform/retention/platformRetention.validation.js';


const validPolicyBody = {
    expectedVersion: null,
    enabled: true,
    retentionDays: 365,
    batchSize: 100,
    maxBatchesPerRun: 10,
    schedule: {
        intervalMinutes: 1440,
    },
    manualExecutionEnabled: true,
};


describe('platformRetention.validation', () => {
    it('accepte uniquement une target du registre code-owned', () => {
        expect(
            platformRetentionTargetParamsSchema.safeParse({
                targetKey: 'audit_log',
            }).success,
        ).toBe(true);

        expect(
            platformRetentionTargetParamsSchema.safeParse({
                targetKey: 'arbitrary_collection',
            }).success,
        ).toBe(false);
    });

    it('accepte une configuration administrable explicite', () => {
        expect(
            createRetentionPolicyVersionBodySchema.safeParse(
                validPolicyBody,
            ).success,
        ).toBe(true);
    });

    it('refuse tout contrôle technique libre de la purge', () => {
        for (const forbiddenField of [
            'targetKey',
            'schemaVersion',
            'collection',
            'filter',
            'cutoff',
            'action',
        ]) {
            expect(
                createRetentionPolicyVersionBodySchema.safeParse({
                    ...validPolicyBody,
                    [forbiddenField]: 'forbidden',
                }).success,
            ).toBe(false);
        }
    });

    it('ne convertit pas les nombres fournis sous forme de chaînes', () => {
        expect(
            createRetentionPolicyVersionBodySchema.safeParse({
                ...validPolicyBody,
                retentionDays: '365',
            }).success,
        ).toBe(false);
    });

    it('ferme strictement le contrat de confirmation destructive', () => {
        const validExecutionBody = {
            expectedPolicyVersion: 3,
            expectedEligibleCount: 42,
            expectedMaxAffectedThisRun: 42,
            confirmation: 'PURGE_AUDIT_LOG_V3',
        };

        expect(
            executeRetentionPolicyBodySchema.safeParse(
                validExecutionBody,
            ).success,
        ).toBe(true);

        expect(
            executeRetentionPolicyBodySchema.safeParse({
                ...validExecutionBody,
                cutoff: '2026-01-01T00:00:00.000Z',
            }).success,
        ).toBe(false);
    });
});
