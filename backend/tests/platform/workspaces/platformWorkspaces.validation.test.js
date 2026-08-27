import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    suspendPlatformWorkspaceBodySchema,
} from '../../../modules/platform/workspaces/platformWorkspaces.validation.js';

describe('suspendPlatformWorkspaceBodySchema', () => {
    it('accepte un motif structuré sans détail', () => {
        const result = suspendPlatformWorkspaceBodySchema.parse({
            statusReason: 'administrative_review',
        });

        expect(result).toEqual({
            statusReason: 'administrative_review',
        });
    });

    it('accepte le motif other avec une justification', () => {
        const result = suspendPlatformWorkspaceBodySchema.parse({
            statusReason: 'other',
            statusReasonDetails: 'Situation exceptionnelle',
        });

        expect(result.statusReason).toBe('other');
    });

    it('refuse le motif other sans justification', () => {
        expect(() => suspendPlatformWorkspaceBodySchema.parse({
            statusReason: 'other',
        })).toThrow();
    });
});
