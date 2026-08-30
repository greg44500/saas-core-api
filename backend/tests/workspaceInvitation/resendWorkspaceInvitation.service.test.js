import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
} from '../../constants/auditActions.constants.js';
import {
    WORKSPACE_INVITATION_DELIVERY_STATUS,
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import {
    resendWorkspaceInvitation,
} from '../../modules/workspaceInvitation/resendWorkspaceInvitation.service.js';
import {
    WorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitation.model.js';

vi.mock('mongoose', () => ({
    default: {
        connection: { transaction: vi.fn() },
        trusted: (value) => value,
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock(
    '../../modules/workspaceInvitation/workspaceInvitation.model.js',
    () => ({
        WorkspaceInvitation: { findOne: vi.fn() },
    }),
);

describe('resendWorkspaceInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('remplace le secret et réinitialise la livraison', async () => {
        const session = { id: 'session' };
        const now = new Date('2026-08-30T09:00:00.000Z');
        const oldHash = 'a'.repeat(64);
        const invitation = {
            _id: 'invitation-id',
            tokenHash: oldHash,
            expiresAt: new Date('2026-09-01T09:00:00.000Z'),
            status: WORKSPACE_INVITATION_STATUS.PENDING,
            deliveryStatus: WORKSPACE_INVITATION_DELIVERY_STATUS.FAILED,
            lastDeliveryAttemptAt: now,
            deliveredAt: null,
            save: vi.fn().mockResolvedValue(undefined),
        };

        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback(session),
        );
        WorkspaceInvitation.findOne.mockReturnValue({
            session: vi.fn().mockResolvedValue(invitation),
        });
        createAuditLog.mockResolvedValue(undefined);

        const result = await resendWorkspaceInvitation({
            workspaceId: 'workspace-id',
            invitationId: 'invitation-id',
            actorId: 'actor-id',
            now,
        });

        expect(result.token).toMatch(/^[a-f\d]{64}$/);
        expect(invitation.tokenHash).toMatch(/^[a-f\d]{64}$/);
        expect(invitation.tokenHash).not.toBe(oldHash);
        expect(invitation.tokenHash).not.toBe(result.token);
        expect(invitation.expiresAt).toEqual(
            new Date('2026-09-06T09:00:00.000Z'),
        );
        expect(invitation.deliveryStatus).toBe(
            WORKSPACE_INVITATION_DELIVERY_STATUS.PENDING,
        );
        expect(invitation.lastDeliveryAttemptAt).toBeNull();
        expect(invitation.save).toHaveBeenCalledWith({ session });
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.MEMBER_INVITATION_RESENT,
            }),
            { session },
        );
    });
});
