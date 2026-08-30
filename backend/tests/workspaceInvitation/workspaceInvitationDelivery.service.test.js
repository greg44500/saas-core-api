import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    WORKSPACE_INVITATION_DELIVERY_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import { sendEmail } from '../../services/email.service.js';
import {
    WorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitation.model.js';
import {
    deliverWorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitationDelivery.service.js';

vi.mock('../../services/email.service.js', () => ({
    sendEmail: vi.fn(),
}));

vi.mock(
    '../../modules/workspaceInvitation/workspaceInvitation.model.js',
    () => ({
        WorkspaceInvitation: {
            findByIdAndUpdate: vi.fn(),
        },
    }),
);

vi.mock(
    '../../modules/workspaceInvitation/workspaceInvitationUrl.js',
    () => ({
        buildWorkspaceInvitationUrl: vi.fn(() =>
            'https://app.example.test/invitations/accept?token=raw-token'),
    }),
);

vi.mock(
    '../../services/emailTemplates/workspaceInvitationEmail.js',
    () => ({
        buildWorkspaceInvitationEmail: vi.fn(() => ({
            subject: 'Invitation',
            text: 'Invitation text',
            html: '<p>Invitation</p>',
        })),
    }),
);

describe('deliverWorkspaceInvitation', () => {
    const now = new Date('2026-08-30T09:00:00.000Z');
    const invitation = {
        _id: 'invitation-id',
        emailCanonical: 'member@example.com',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('marque sent lorsque le transport réussit', async () => {
        sendEmail.mockResolvedValue({ messageId: 'mail-id' });
        WorkspaceInvitation.findByIdAndUpdate.mockResolvedValue({
            ...invitation,
            deliveryStatus: WORKSPACE_INVITATION_DELIVERY_STATUS.SENT,
        });

        const result = await deliverWorkspaceInvitation({
            invitation,
            token: 'raw-token',
            now,
        });

        expect(sendEmail).toHaveBeenCalledWith({
            to: 'member@example.com',
            subject: 'Invitation',
            text: 'Invitation text',
            html: '<p>Invitation</p>',
        });
        expect(WorkspaceInvitation.findByIdAndUpdate)
            .toHaveBeenCalledWith(
                'invitation-id',
                {
                    $set: {
                        deliveryStatus:
                            WORKSPACE_INVITATION_DELIVERY_STATUS.SENT,
                        lastDeliveryAttemptAt: now,
                        deliveredAt: now,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            );
        expect(result.deliveryStatus).toBe(
            WORKSPACE_INVITATION_DELIVERY_STATUS.SENT,
        );
    });

    it('conserve l’invitation et marque failed lorsque SMTP échoue', async () => {
        sendEmail.mockRejectedValue(new Error('smtp unavailable'));
        WorkspaceInvitation.findByIdAndUpdate.mockResolvedValue({
            ...invitation,
            deliveryStatus: WORKSPACE_INVITATION_DELIVERY_STATUS.FAILED,
        });

        const result = await deliverWorkspaceInvitation({
            invitation,
            token: 'raw-token',
            now,
        });

        expect(WorkspaceInvitation.findByIdAndUpdate)
            .toHaveBeenCalledWith(
                'invitation-id',
                {
                    $set: {
                        deliveryStatus:
                            WORKSPACE_INVITATION_DELIVERY_STATUS.FAILED,
                        lastDeliveryAttemptAt: now,
                        deliveredAt: null,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            );
        expect(result.deliveryStatus).toBe(
            WORKSPACE_INVITATION_DELIVERY_STATUS.FAILED,
        );
    });
});
