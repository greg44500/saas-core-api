import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    create,
    resend,
} from '../../modules/workspaceInvitation/workspaceInvitation.controller.js';
import {
    createWorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitation.service.js';
import {
    resendWorkspaceInvitation,
} from '../../modules/workspaceInvitation/resendWorkspaceInvitation.service.js';
import {
    deliverWorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitationDelivery.service.js';

vi.mock(
    '../../modules/workspaceInvitation/workspaceInvitation.service.js',
    () => ({
        createWorkspaceInvitation: vi.fn(),
        revokeWorkspaceInvitation: vi.fn(),
    }),
);
vi.mock(
    '../../modules/workspaceInvitation/resendWorkspaceInvitation.service.js',
    () => ({ resendWorkspaceInvitation: vi.fn() }),
);
vi.mock(
    '../../modules/workspaceInvitation/workspaceInvitationDelivery.service.js',
    () => ({ deliverWorkspaceInvitation: vi.fn() }),
);
vi.mock(
    '../../modules/workspaceInvitation/workspaceInvitationRead.service.js',
    () => ({ listWorkspaceInvitations: vi.fn() }),
);
vi.mock(
    '../../modules/workspaceInvitation/acceptWorkspaceInvitation.service.js',
    () => ({ acceptWorkspaceInvitation: vi.fn() }),
);

const createResponse = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

const baseRequest = () => ({
    workspace: { _id: 'workspace-id' },
    user: { id: 'actor-id' },
    context: {
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
    },
    validated: {
        body: {
            email: 'member@example.com',
            roleId: '507f1f77bcf86cd799439011',
        },
        params: {
            invitationId: '507f1f77bcf86cd799439012',
        },
    },
});

describe('workspace invitation controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ne renvoie jamais le token brut après création', async () => {
        const invitation = {
            _id: 'invitation-id',
            emailCanonical: 'member@example.com',
            status: 'pending',
            deliveryStatus: 'pending',
            expiresAt: new Date(),
            createdAt: new Date(),
        };
        const delivered = {
            ...invitation,
            deliveryStatus: 'sent',
        };
        createWorkspaceInvitation.mockResolvedValue({
            invitation,
            token: 'secret-token',
        });
        deliverWorkspaceInvitation.mockResolvedValue(delivered);

        const req = baseRequest();
        const res = createResponse();
        await create(req, res);

        const payload = res.json.mock.calls[0][0];
        expect(JSON.stringify(payload)).not.toContain('secret-token');
        expect(payload.data.invitation.deliveryStatus).toBe('sent');
    });

    it('ne renvoie jamais le nouveau token après resend', async () => {
        const invitation = {
            _id: 'invitation-id',
            emailCanonical: 'member@example.com',
            status: 'pending',
            deliveryStatus: 'pending',
            expiresAt: new Date(),
            createdAt: new Date(),
        };
        resendWorkspaceInvitation.mockResolvedValue({
            invitation,
            token: 'rotated-secret-token',
        });
        deliverWorkspaceInvitation.mockResolvedValue({
            ...invitation,
            deliveryStatus: 'sent',
        });

        const req = baseRequest();
        const res = createResponse();
        await resend(req, res);

        const payload = res.json.mock.calls[0][0];
        expect(JSON.stringify(payload)).not.toContain(
            'rotated-secret-token',
        );
    });
});
