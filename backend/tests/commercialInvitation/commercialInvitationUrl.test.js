import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock('../../config/env.js', () => ({
    env: {
        CLIENT_URL: 'https://app.example.com',
    },
}));

import {
    buildCommercialInvitationUrl,
} from '../../modules/commercialInvitation/commercialInvitationUrl.js';


describe('buildCommercialInvitationUrl', () => {
    it('place le secret dans le fragment et jamais dans la query string', () => {
        const token = 'a'.repeat(64);
        const invitationUrl = new URL(
            buildCommercialInvitationUrl({ token }),
        );

        expect(invitationUrl.pathname).toBe(
            '/commercial-invitations/accept',
        );
        expect(invitationUrl.search).toBe('');
        expect(invitationUrl.hash).toBe(`#token=${token}`);
    });
});
