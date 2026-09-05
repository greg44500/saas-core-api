import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    closePlatformWorkspaceBodySchema,
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

describe('closePlatformWorkspaceBodySchema', () => {
    it('accepte un motif de fermeture structuré', () => {
        expect(closePlatformWorkspaceBodySchema.parse({
            statusReason: 'platform_decision',
        })).toEqual({
            statusReason: 'platform_decision',
        });
    });

    it('impose un détail lorsque le motif vaut other', () => {
        expect(() => closePlatformWorkspaceBodySchema.parse({
            statusReason: 'other',
        })).toThrow();
    });
});
