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
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { authorizeRoleDelegation } from '../../middlewares/authorizeRoleDelegation.js';
import { enforcePlanFeature } from '../../middlewares/enforcePlanFeature.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import {
    CORE_PLAN_FEATURE,
} from '../../modules/plan/planCapability.registry.js';
import {
    accept,
    create,
    revoke,
} from '../../modules/workspaceInvitation/workspaceInvitation.controller.js';
import {
    invitationAcceptanceRouter,
    workspaceInvitationRouter,
} from '../../modules/workspaceInvitation/workspaceInvitation.routes.js';

const {
    validationMiddleware,
    workspaceContextMiddleware,
    permissionMiddleware,
    featureMiddleware,
    accessModeMiddleware,
    delegationMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => {
        req.validated = {
            params: req.params,
            query: { page: 1, limit: 20 },
            body: req.body,
        };
        next();
    }),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = { _id: req.params.workspaceId };
        req.permissions = [CORE_PERMISSION.MEMBER_INVITE];
        next();
    }),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    featureMiddleware: vi.fn((req, res, next) => next()),
    accessModeMiddleware: vi.fn((req, res, next) => next()),
    delegationMiddleware: vi.fn((req, res, next) => next()),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = { id: 'user-id' };
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

vi.mock('../../middlewares/authorizeRoleDelegation.js', () => ({
    authorizeRoleDelegation: delegationMiddleware,
}));

vi.mock('../../middlewares/enforcePlanFeature.js', () => ({
    enforcePlanFeature: vi.fn(() => featureMiddleware),
}));

vi.mock('../../middlewares/enforceWorkspaceAccessMode.js', () => ({
    enforceWorkspaceAccessMode: vi.fn(() => accessModeMiddleware),
}));

vi.mock(
    '../../modules/workspaceInvitation/workspaceInvitation.controller.js',
    () => {
        const handler = () => vi.fn((req, res) => {
            res.status(200).json({ status: 'success' });
        });

        return {
            accept: handler(),
            create: handler(),
            list: handler(),
            resend: handler(),
            revoke: handler(),
        };
    },
);

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(
        '/workspaces/:workspaceId/invitations',
        workspaceInvitationRouter,
    );
    app.use('/invitations', invitationAcceptanceRouter);
    return app;
};

beforeEach(() => {
    authenticate.mockClear();
    validationMiddleware.mockClear();
    workspaceContextMiddleware.mockClear();
    permissionMiddleware.mockClear();
    featureMiddleware.mockClear();
    accessModeMiddleware.mockClear();
    delegationMiddleware.mockClear();
    create.mockClear();
    revoke.mockClear();
    accept.mockClear();
});

describe('workspaceInvitation.routes', () => {
    it('protège la création avec member:invite, team_management, le mode normal et l’anti-escalade', async () => {
        const response = await request(createApp())
            .post('/workspaces/507f1f77bcf86cd799439011/invitations')
            .send({
                email: 'member@example.com',
                roleId: '507f1f77bcf86cd799439012',
            });

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalledOnce();
        expect(loadWorkspaceContext).toHaveBeenCalledOnce();
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.MEMBER_INVITE,
        );
        expect(enforcePlanFeature).toHaveBeenCalledWith(
            CORE_PLAN_FEATURE.TEAM_MANAGEMENT,
        );
        expect(featureMiddleware).toHaveBeenCalledOnce();
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith();
        expect(accessModeMiddleware).toHaveBeenCalledOnce();
        expect(authorizeRoleDelegation).toHaveBeenCalledOnce();
        expect(create).toHaveBeenCalledOnce();
    });

    it('autorise la révocation en remédiation seulement si team_management reste disponible', async () => {
        const response = await request(createApp())
            .delete(
                '/workspaces/507f1f77bcf86cd799439011/invitations/507f1f77bcf86cd799439012',
            );

        expect(response.status).toBe(200);
        expect(enforcePlanFeature).toHaveBeenCalledWith(
            CORE_PLAN_FEATURE.TEAM_MANAGEMENT,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith({
            allowDuringRemediation: true,
        });
        expect(revoke).toHaveBeenCalledOnce();
    });

    it('accepte hors contexte workspace mais exige une authentification', async () => {
        const response = await request(createApp())
            .post('/invitations/accept')
            .send({ token: 'a'.repeat(64) });

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalledOnce();
        expect(workspaceContextMiddleware).not.toHaveBeenCalled();
        expect(permissionMiddleware).not.toHaveBeenCalled();
        expect(featureMiddleware).not.toHaveBeenCalled();
        expect(delegationMiddleware).not.toHaveBeenCalled();
        expect(accept).toHaveBeenCalledOnce();
    });
});
