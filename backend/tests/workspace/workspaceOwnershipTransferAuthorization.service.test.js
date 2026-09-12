import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
} from '../../constants/auditActions.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { Workspace } from '../../modules/workspace/workspace.model.js';
import {
    authorizeWorkspaceOwnershipTransfer,
    revokeWorkspaceOwnershipTransferAuthorization,
    serializeWorkspaceOwnershipTransferAuthorization,
} from '../../modules/workspace/workspaceOwnershipTransferAuthorization.service.js';

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../modules/workspace/workspace.model.js', () => ({
    Workspace: {
        findById: vi.fn(),
    },
}));

const queryResolving = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

describe('workspaceOwnershipTransferAuthorization.service', () => {
    const workspaceId = new mongoose.Types.ObjectId().toString();
    const actorId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-09-12T12:00:00.000Z');
    let transactionSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        transactionSpy = vi
            .spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback({ id: 'session' }));
        createAuditLog.mockResolvedValue(undefined);
    });

    afterEach(() => {
        transactionSpy?.mockRestore();
    });

    it('autorise temporairement un seul workspace avec expiration serveur et audit', async () => {
        const workspace = {
            _id: new mongoose.Types.ObjectId(workspaceId),
            status: 'active',
            ownershipTransferAuthorization: null,
            updatedBy: null,
            save: vi.fn().mockResolvedValue(undefined),
        };
        Workspace.findById.mockReturnValue(queryResolving(workspace));

        const result = await authorizeWorkspaceOwnershipTransfer({
            workspaceId,
            actorId,
            now,
        });

        expect(result.active).toBe(true);
        expect(result.status).toBe('active');
        expect(result.ttlHours).toBeGreaterThan(0);
        expect(result.ttlHours).toBeLessThanOrEqual(24);
        expect(new Date(result.expiresAt).getTime()).toBe(
            now.getTime() + result.ttlHours * 60 * 60 * 1000,
        );
        expect(workspace.save).toHaveBeenCalledWith({ session: { id: 'session' } });
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZED,
                metadata: expect.objectContaining({
                    authorizationId: result.id,
                    ttlHours: result.ttlHours,
                }),
            }),
            { session: { id: 'session' } },
        );
    });

    it('refuse de prolonger silencieusement une autorisation encore active', async () => {
        const workspace = {
            _id: new mongoose.Types.ObjectId(workspaceId),
            status: 'active',
            ownershipTransferAuthorization: {
                _id: new mongoose.Types.ObjectId(),
                authorizedAt: now,
                expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
                revokedAt: null,
                consumedAt: null,
            },
        };
        Workspace.findById.mockReturnValue(queryResolving(workspace));

        await expect(
            authorizeWorkspaceOwnershipTransfer({ workspaceId, actorId, now }),
        ).rejects.toMatchObject({ statusCode: 409 });
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('révoque une autorisation active et la rend immédiatement inactive', async () => {
        const authorizationId = new mongoose.Types.ObjectId();
        const workspace = {
            _id: new mongoose.Types.ObjectId(workspaceId),
            status: 'active',
            ownershipTransferAuthorization: {
                _id: authorizationId,
                authorizedAt: now,
                expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
                revokedAt: null,
                revokedBy: null,
                consumedAt: null,
                consumedBy: null,
            },
            updatedBy: null,
            save: vi.fn().mockResolvedValue(undefined),
        };
        Workspace.findById.mockReturnValue(queryResolving(workspace));

        const result = await revokeWorkspaceOwnershipTransferAuthorization({
            workspaceId,
            actorId,
            now,
        });

        expect(result.active).toBe(false);
        expect(result.status).toBe('revoked');
        expect(workspace.ownershipTransferAuthorization.revokedAt).toEqual(now);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action:
                    AUDIT_ACTION.WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_REVOKED,
                metadata: { authorizationId: authorizationId.toString() },
            }),
            { session: { id: 'session' } },
        );
    });

    it('dérive expiration et consommation sans job de mutation', () => {
        const authorization = {
            _id: new mongoose.Types.ObjectId(),
            authorizedAt: new Date('2026-09-12T10:00:00.000Z'),
            expiresAt: new Date('2026-09-12T11:00:00.000Z'),
            revokedAt: null,
            consumedAt: null,
        };

        expect(
            serializeWorkspaceOwnershipTransferAuthorization(
                authorization,
                { now },
            ),
        ).toEqual(expect.objectContaining({ active: false, status: 'expired' }));

        authorization.consumedAt = new Date('2026-09-12T10:30:00.000Z');
        expect(
            serializeWorkspaceOwnershipTransferAuthorization(
                authorization,
                { now },
            ),
        ).toEqual(expect.objectContaining({ active: false, status: 'consumed' }));
    });
});
