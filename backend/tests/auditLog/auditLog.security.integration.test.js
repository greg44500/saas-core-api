import express from 'express';
import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { errorHandler } from '../../middlewares/errorHandler.js';
import { auditLogRouter } from '../../modules/auditLog/auditLog.routes.js';
import {
    listWorkspaceAuditLogs,
} from '../../modules/auditLog/auditLog.service.js';


const {
    authenticateMock,
    loadWorkspaceContextMock,
} = vi.hoisted(() => ({
    authenticateMock: vi.fn((req, res, next) => {
        req.user = { _id: '507f1f77bcf86cd799439099' };
        next();
    }),
    loadWorkspaceContextMock: vi.fn((req, res, next) => {
        const role = req.get('x-test-role');

        if (role === 'outsider') {
            const error = new Error('Accès au workspace interdit');
            error.statusCode = 403;
            error.status = 'fail';
            error.isOperational = true;
            return next(error);
        }

        req.workspace = { _id: req.params.workspaceId };
        req.permissions = ['workspace:read'];

        if (role === 'owner' || role === 'admin') {
            req.permissions.push(CORE_PERMISSION.AUDIT_READ);
        }

        next();
    }),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: authenticateMock,
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: loadWorkspaceContextMock,
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
    listWorkspaceAuditLogs: vi.fn(),
}));


const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const OTHER_WORKSPACE_ID = '507f1f77bcf86cd799439012';

const createApp = () => {
    const app = express();

    app.use(
        '/workspaces/:workspaceId/audit-logs',
        auditLogRouter,
    );
    app.use(errorHandler);

    return app;
};


beforeEach(() => {
    vi.clearAllMocks();

    listWorkspaceAuditLogs.mockResolvedValue({
        auditLogs: [
            {
                id: '507f1f77bcf86cd799439020',
                actor: null,
                action: 'WORKSPACE_UPDATED',
                status: 'success',
                entity: {
                    type: 'Workspace',
                    id: WORKSPACE_ID,
                },
                createdAt: new Date('2026-08-30T08:00:00.000Z'),
            },
        ],
        pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
        },
    });
});


describe('AuditLog workspace security integration', () => {
    it.each(['owner', 'admin'])(
        'autorise le rôle %s lorsqu’il possède audit:read',
        async (role) => {
            const response = await request(createApp())
                .get(`/workspaces/${WORKSPACE_ID}/audit-logs`)
                .set('x-test-role', role);

            expect(response.status).toBe(200);
            expect(listWorkspaceAuditLogs).toHaveBeenCalledOnce();
            expect(listWorkspaceAuditLogs).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: WORKSPACE_ID,
                }),
            );
        },
    );

    it.each(['manager', 'member', 'reader'])(
        'refuse le rôle %s sans audit:read',
        async (role) => {
            const response = await request(createApp())
                .get(`/workspaces/${WORKSPACE_ID}/audit-logs`)
                .set('x-test-role', role);

            expect(response.status).toBe(403);
            expect(response.body).toMatchObject({
                status: 'fail',
                message: 'Permission insuffisante',
            });
            expect(listWorkspaceAuditLogs).not.toHaveBeenCalled();
        },
    );

    it('refuse un utilisateur sans membership dans le workspace ciblé', async () => {
        const response = await request(createApp())
            .get(`/workspaces/${WORKSPACE_ID}/audit-logs`)
            .set('x-test-role', 'outsider');

        expect(response.status).toBe(403);
        expect(listWorkspaceAuditLogs).not.toHaveBeenCalled();
    });

    it('impose le workspace issu du chemin HTTP au service', async () => {
        const response = await request(createApp())
            .get(
                `/workspaces/${WORKSPACE_ID}/audit-logs`
                + '?action=WORKSPACE_UPDATED&status=success'
                + '&from=2026-08-01T00:00:00.000Z'
                + '&to=2026-08-31T23:59:59.999Z',
            )
            .set('x-test-role', 'owner');

        expect(response.status).toBe(200);
        expect(listWorkspaceAuditLogs).toHaveBeenCalledWith({
            workspaceId: WORKSPACE_ID,
            page: 1,
            limit: 20,
            action: 'WORKSPACE_UPDATED',
            actorId: null,
            entityType: null,
            status: 'success',
            from: new Date('2026-08-01T00:00:00.000Z'),
            to: new Date('2026-08-31T23:59:59.999Z'),
        });
    });

    it('refuse une tentative de surcharger le workspace par la query string', async () => {
        const response = await request(createApp())
            .get(
                `/workspaces/${WORKSPACE_ID}/audit-logs`
                + `?workspaceId=${OTHER_WORKSPACE_ID}`,
            )
            .set('x-test-role', 'owner');

        expect(response.status).toBe(400);
        expect(loadWorkspaceContextMock).not.toHaveBeenCalled();
        expect(listWorkspaceAuditLogs).not.toHaveBeenCalled();
    });

    it('n’expose aucun champ technique sensible dans la réponse workspace', async () => {
        const response = await request(createApp())
            .get(`/workspaces/${WORKSPACE_ID}/audit-logs`)
            .set('x-test-role', 'admin');

        expect(response.status).toBe(200);
        expect(response.body.data.auditLogs[0]).not.toHaveProperty(
            'ipAddress',
        );
        expect(response.body.data.auditLogs[0]).not.toHaveProperty(
            'userAgent',
        );
        expect(response.body.data.auditLogs[0]).not.toHaveProperty(
            'metadata',
        );
    });
});
