import { describe, expect, it } from 'vitest';

import {
    buildWorkspaceInvitationUrl,
} from '../../modules/workspaceInvitation/workspaceInvitationUrl.js';


describe('buildWorkspaceInvitationUrl', () => {
    it("place le secret uniquement dans le fragment de l'URL frontend", () => {
        const result = buildWorkspaceInvitationUrl({
            token: 'workspace-invitation-token',
        });

        const url = new URL(result);

        expect(url.origin).toBe('http://localhost:5173');
        expect(url.pathname).toBe('/invitations/accept');
        expect(url.search).toBe('');

        const fragmentParams = new URLSearchParams(url.hash.slice(1));

        expect(fragmentParams.get('token')).toBe(
            'workspace-invitation-token',
        );
    });
});
