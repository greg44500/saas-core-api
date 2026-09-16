import express from 'express';
import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { authenticate } from '../../middlewares/authenticate.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { helpService } from '../../modules/help/help.service.js';
import {
    platformHelpRouter,
    workspaceHelpRouter,
} from '../../modules/help/help.routes.js';
import {
    platformHelpEntryParamsSchema,
    workspaceHelpEntryParamsSchema,
    workspaceHelpParamsSchema,
} from '../../modules/help/help.validation.js';


const {
    validationMiddleware,
    workspaceContextMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => next()),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = { _id: req.params.workspaceId };
        req.permissions = ['workspace:read'];
        req.role = { key: 'member', isSystem: true };
        next();
    }),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = { _id: 'user-id' };
        next();
    }),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: workspaceContextMiddleware,
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock('../../modules/help/help.service.js', () => ({
    helpService: {
        getWorkspaceCatalog: vi.fn(async () => ({
            context: 'workspace',
            categories: [],
            entries: [],
        })),
        getWorkspaceEntry: vi.fn(async ({ entryId }) => ({
            id: entryId,
        })),
        getPlatformCatalog: vi.fn(async () => ({
            context: 'platform',
            categories: [],
            entries: [],
        })),
        getPlatformEntry: vi.fn(async ({ entryId }) => ({
            id: entryId,
        })),
    },
}));

/*
 * validateRequest(...) est exécuté au montage du routeur, pas à chaque requête.
 * On capture donc la configuration déclarée avant de nettoyer les mocks runtime.
 */
const registeredParamSchemas = validateRequest.mock.calls
    .map(([configuration]) => configuration.params)
    .filter(Boolean);

beforeEach(() => {
    vi.clearAllMocks();
});


describe('help.routes', () => {
    it('protège et contextualise le catalogue Workspace', async () => {
        const app = express();
        app.use(
            '/workspaces/:workspaceId/help',
            workspaceHelpRouter,
        );

        const response = await request(app)
            .get('/workspaces/507f1f77bcf86cd799439011/help');

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalledOnce();
        expect(registeredParamSchemas).toContain(
            workspaceHelpParamsSchema,
        );
        expect(loadWorkspaceContext).toHaveBeenCalledOnce();
        expect(helpService.getWorkspaceCatalog).toHaveBeenCalledWith({
            workspace: { _id: '507f1f77bcf86cd799439011' },
            permissions: ['workspace:read'],
            role: { key: 'member', isSystem: true },
        });
    });

    it('valide l’accès direct à une fiche Workspace', async () => {
        const app = express();
        app.use(
            '/workspaces/:workspaceId/help',
            workspaceHelpRouter,
        );

        const response = await request(app)
            .get('/workspaces/507f1f77bcf86cd799439011/help/workspace.test.read');

        expect(response.status).toBe(200);
        expect(registeredParamSchemas).toContain(
            workspaceHelpEntryParamsSchema,
        );
        expect(helpService.getWorkspaceEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                entryId: 'workspace.test.read',
            }),
        );
    });

    it('expose le catalogue Platform à partir du contexte utilisateur déjà authentifié par le parent', async () => {
        const app = express();
        app.use((req, res, next) => {
            req.user = { _id: 'user-id' };
            next();
        });
        app.use('/platform/help', platformHelpRouter);

        const response = await request(app).get('/platform/help');

        expect(response.status).toBe(200);
        expect(helpService.getPlatformCatalog).toHaveBeenCalledWith({
            user: { _id: 'user-id' },
        });
    });

    it('valide l’identifiant d’une fiche Platform avant le controller', async () => {
        const app = express();
        app.use((req, res, next) => {
            req.user = { _id: 'user-id' };
            next();
        });
        app.use('/platform/help', platformHelpRouter);

        const response = await request(app)
            .get('/platform/help/platform.users.read');

        expect(response.status).toBe(200);
        expect(registeredParamSchemas).toContain(
            platformHelpEntryParamsSchema,
        );
        expect(helpService.getPlatformEntry).toHaveBeenCalledWith({
            user: { _id: 'user-id' },
            entryId: 'platform.users.read',
        });
    });
});