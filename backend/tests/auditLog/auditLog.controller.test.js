import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    listWorkspaceAuditLogEntries,
} from '../../modules/auditLog/auditLog.controller.js';
import {
    listWorkspaceAuditLogs,
} from '../../modules/auditLog/auditLog.service.js';

vi.mock(
    '../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
        listWorkspaceAuditLogs: vi.fn(),
    }),
);

beforeEach(() => {
    vi.clearAllMocks();
});

const createResponse = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

describe('auditLog.controller', () => {
    it('transmet uniquement le workspace chargé et les filtres validés', async () => {
        const from = new Date('2026-08-01T06:00:00.000Z');
        const to = new Date('2026-08-30T16:00:00.000Z');
        const auditLogs = [{ id: 'audit-log-id' }];
        const pagination = {
            page: 2,
            limit: 20,
            total: 1,
            totalPages: 1,
        };

        listWorkspaceAuditLogs.mockResolvedValue({
            auditLogs,
            pagination,
        });

        const req = {
            workspace: { _id: '507f1f77bcf86cd799439011' },
            validated: {
                query: {
                    page: 2,
                    limit: 20,
                    action: 'WORKSPACE_UPDATED',
                    actorId: '507f1f77bcf86cd799439012',
                    entityType: 'Workspace',
                    status: 'success',
                    from,
                    to,
                },
            },
        };
        const res = createResponse();

        await listWorkspaceAuditLogEntries(req, res);

        expect(listWorkspaceAuditLogs).toHaveBeenCalledWith({
            workspaceId: '507f1f77bcf86cd799439011',
            page: 2,
            limit: 20,
            action: 'WORKSPACE_UPDATED',
            actorId: '507f1f77bcf86cd799439012',
            entityType: 'Workspace',
            status: 'success',
            from,
            to,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { auditLogs },
            meta: pagination,
        });
    });
});
