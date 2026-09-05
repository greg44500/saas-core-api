import express from 'express';
import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    CORE_PERMISSION,
} from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePermission,
} from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import {
    loadWorkspaceContext,
} from '../../middlewares/loadWorkspaceContext.js';
import {
    validateRequest,
} from '../../middlewares/validateRequest.js';
import {
    workspaceIdParamsSchema,
} from '../../modules/workspace/workspace.validation.js';
import {
    transferOwnership,
} from '../../modules/workspace/workspaceOwnership.controller.js';
import {
    workspaceOwnershipRouter,
} from '../../modules/workspace/workspaceOwnership.routes.js';
import {
    transferWorkspaceOwnershipBodySchema,
} from '../../modules/workspace/workspaceOwnership.validation.js';


const {
    validationMiddleware,
    workspaceContextMiddleware,
    permissionMiddleware,
    workspaceAccessMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => {
        req.validated = {
            params: req.params,
            body: req.body,
        };
        next();
    }),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = {
            _id: req.params.workspaceId,
        };
        next();
    }),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    workspaceAccessMiddleware: vi.fn((req, res, next) => next()),
}));


vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = {
            id: 'actor-id',
        };
        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: workspaceContextMiddleware,
}));

vi.mock('../../middlewares/authorizePermission.js', () => ({
    authorizePermission: vi.fn(() => permissionMiddleware),
}));

vi.mock('../../middlewares/enforceWorkspaceAccessMode.js', () => ({
    enforceWorkspaceAccessMode: vi.fn(() => workspaceAccessMiddleware),
}));

vi.mock(
    '../../modules/workspace/workspaceOwnership.controller.js',
    () => ({
        transferOwnership: vi.fn((req, res) =>
            res.status(200).json({
                status: 'success',
            })),
    }),
);


const app = express();
app.use(express.json());
app.use(
    '/workspaces/:workspaceId/ownership',
    workspaceOwnershipRouter,
);


beforeEach(() => {
    /*
     * Les factories sont invoquées à la construction du routeur. Leurs appels
     * décrivent donc la configuration statique et ne sont pas effacés ici.
     * Les middlewares retournés s'exécutent à chaque requête et sont remis à
     * zéro entre les scénarios.
     */
    authenticate.mockClear();
    validationMiddleware.mockClear();
    workspaceContextMiddleware.mockClear();
    permissionMiddleware.mockClear();
    workspaceAccessMiddleware.mockClear();
    transferOwnership.mockClear();
});


describe('workspaceOwnership.routes', () => {
    it('protège, valide et autorise explicitement le transfert en remédiation', async () => {
        const response = await request(app)
            .patch(
                '/workspaces/507f1f77bcf86cd799439011/ownership',
            )
            .send({
                newOwnerMemberId:
                    '507f1f77bcf86cd799439012',
                previousOwnerRoleId:
                    '507f1f77bcf86cd799439013',
                currentPassword:
                    'Correct Horse Battery Staple',
            });

        expect(response.status).toBe(200);

        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
            body: transferWorkspaceOwnershipBodySchema,
        });

        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
        );

        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith({
            allowDuringRemediation: true,
        });

        expect(authenticate).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(workspaceContextMiddleware).toHaveBeenCalledOnce();
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(workspaceAccessMiddleware).toHaveBeenCalledOnce();
        expect(transferOwnership).toHaveBeenCalledOnce();

        expect(
            workspaceContextMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            permissionMiddleware.mock.invocationCallOrder[0],
        );

        expect(
            permissionMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            workspaceAccessMiddleware.mock.invocationCallOrder[0],
        );

        expect(
            workspaceAccessMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            transferOwnership.mock.invocationCallOrder[0],
        );
    });
});
