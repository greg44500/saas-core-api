import { describe, expect, it } from 'vitest';

import {
    buildPlatformInvitationUrl,
} from '../../modules/platformInvitation/platformInvitationUrl.js';


describe('buildPlatformInvitationUrl', () => {
    it("place le secret uniquement dans le fragment de l'URL frontend", () => {
        const result = buildPlatformInvitationUrl({
            token: 'platform-invitation-token',
        });

        const url = new URL(result);

        expect(url.origin).toBe('http://localhost:5173');
        expect(url.pathname).toBe('/platform-invitations/accept');
        expect(url.search).toBe('');

        const fragmentParams = new URLSearchParams(url.hash.slice(1));

        expect(fragmentParams.get('token')).toBe(
            'platform-invitation-token',
        );
    });
});
