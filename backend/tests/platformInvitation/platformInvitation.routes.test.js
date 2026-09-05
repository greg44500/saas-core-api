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
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    platformInvitationAcceptRateLimiter,
} from '../../config/platformInvitationRateLimit.config.js';
import {
    platformInvitationAcceptanceRouter,
    platformTeamInvitationRouter,
} from '../../modules/platformInvitation/platformInvitation.routes.js';
import {
    acceptExistingPlatformInvitationBodySchema,
    acceptNewPlatformInvitationBodySchema,
    createPlatformInvitationBodySchema,
    platformInvitationIdParamsSchema,
} from '../../modules/platformInvitation/platformInvitation.validation.js';
import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';


const {
    authMiddleware,
    permissionMiddleware,
    validationMiddleware,
    limiterMiddleware,
    handlers,
} = vi.hoisted(() => ({
    authMiddleware: vi.fn((req, res, next) => {
        req.user = { id: 'user-id' };
        next();
    }),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    limiterMiddleware: vi.fn((req, res, next) => next()),
    handlers: {
        create: vi.fn((req, res) => res.status(201).json({ status: 'success' })),
        list: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        resend: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        revoke: vi.fn((req, res) => res.status(204).send()),
        acceptExisting: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        acceptNew: vi.fn((req, res) => res.status(201).json({ status: 'success' })),
    },
}));

vi.mock(
    '../../middlewares/authenticate.js',
    () => ({
        authenticate: authMiddleware,
    }),
);

vi.mock(
    '../../middlewares/authorizePlatformPermission.js',
    () => ({
        authorizePlatformPermission: vi.fn(
            () => permissionMiddleware,
        ),
    }),
);

vi.mock(
    '../../middlewares/validateRequest.js',
    () => ({
        validateRequest: vi.fn(
            () => validationMiddleware,
        ),
    }),
);

vi.mock(
    '../../config/platformInvitationRateLimit.config.js',
    () => ({
        platformInvitationAcceptRateLimiter: limiterMiddleware,
    }),
);

vi.mock(
    '../../modules/platformInvitation/platformInvitation.controller.js',
    () => handlers,
);


const adminApp = express();
adminApp.use(express.json());
adminApp.use('/team', platformTeamInvitationRouter);

const acceptanceApp = express();
acceptanceApp.use(express.json());
acceptanceApp.use('/platform-invitations', platformInvitationAcceptanceRouter);


beforeEach(() => {
    /**
     * authorizePlatformPermission() et validateRequest() sont des factories
     * exécutées une seule fois au chargement du routeur. On conserve donc leur
     * historique afin de tester le wiring statique des routes. Les middlewares
     * retournés, eux, sont exécutés par chaque requête et peuvent être remis à
     * zéro entre les scénarios.
     */
    authenticate.mockClear();
    platformInvitationAcceptRateLimiter.mockClear();
    authMiddleware.mockClear();
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    limiterMiddleware.mockClear();
    Object.values(handlers).forEach((handler) => handler.mockClear());
});


describe('platformTeamInvitationRouter', () => {
    it('protège la création par team:invite et Zod', async () => {
        const response = await request(adminApp)
            .post('/team/invitations')
            .send({});

        expect(response.status).toBe(201);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.TEAM_INVITE,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            body: createPlatformInvitationBodySchema,
        });
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(handlers.create).toHaveBeenCalledOnce();
    });

    it('protège la lecture par team:read', async () => {
        const response = await request(adminApp)
            .get('/team/invitations?page=1&limit=20');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.TEAM_READ,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            query: paginationQuerySchema,
        });
        expect(handlers.list).toHaveBeenCalledOnce();
    });

    it('utilise une permission dédiée pour le resend', async () => {
        const response = await request(adminApp)
            .post('/team/invitations/507f1f77bcf86cd799439011/resend');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.TEAM_INVITATION_RESEND,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            params: platformInvitationIdParamsSchema,
        });
        expect(handlers.resend).toHaveBeenCalledOnce();
    });

    it('utilise une permission dédiée pour la révocation', async () => {
        const response = await request(adminApp)
            .delete('/team/invitations/507f1f77bcf86cd799439011');

        expect(response.status).toBe(204);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.TEAM_INVITATION_REVOKE,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            params: platformInvitationIdParamsSchema,
        });
        expect(handlers.revoke).toHaveBeenCalledOnce();
    });
});


describe('platformInvitationAcceptanceRouter', () => {
    it('exige authentification pour rattacher un compte existant', async () => {
        const response = await request(acceptanceApp)
            .post('/platform-invitations/accept-existing')
            .send({});

        expect(response.status).toBe(200);
        expect(platformInvitationAcceptRateLimiter).toHaveBeenCalledOnce();
        expect(authenticate).toHaveBeenCalledOnce();
        expect(validateRequest).toHaveBeenCalledWith({
            body: acceptExistingPlatformInvitationBodySchema,
        });
        expect(handlers.acceptExisting).toHaveBeenCalledOnce();
    });

    it('rate-limit et valide le parcours nouveau compte sans authentification préalable', async () => {
        const response = await request(acceptanceApp)
            .post('/platform-invitations/accept-new')
            .send({});

        expect(response.status).toBe(201);
        expect(platformInvitationAcceptRateLimiter).toHaveBeenCalledOnce();
        expect(authenticate).not.toHaveBeenCalled();
        expect(validateRequest).toHaveBeenCalledWith({
            body: acceptNewPlatformInvitationBodySchema,
        });
        expect(handlers.acceptNew).toHaveBeenCalledOnce();
    });
});
