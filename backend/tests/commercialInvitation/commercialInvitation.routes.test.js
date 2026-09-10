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
    commercialInvitationRateLimiter,
} from '../../config/commercialInvitationRateLimit.config.js';
import {
    commercialInvitationAcceptanceRouter,
    platformCommercialInvitationRouter,
} from '../../modules/commercialInvitation/commercialInvitation.routes.js';
import {
    acceptCommercialInvitationBodySchema,
    commercialInvitationIdParamsSchema,
    commercialInvitationRecipientBodySchema,
    createCommercialInvitationBodySchema,
    previewCommercialInvitationBodySchema,
    registerCommercialInvitationRecipientBodySchema,
    revokeCommercialInvitationBodySchema,
} from '../../modules/commercialInvitation/commercialInvitation.validation.js';
import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';

const {
    authMiddleware,
    limiterMiddleware,
    permissionMiddleware,
    validationMiddleware,
    handlers,
} = vi.hoisted(() => ({
    authMiddleware: vi.fn((req, res, next) => {
        req.user = { id: 'user-id' };
        next();
    }),
    limiterMiddleware: vi.fn((req, res, next) => next()),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    handlers: {
        accept: vi.fn((req, res) => res.status(201).json({ status: 'success' })),
        create: vi.fn((req, res) => res.status(201).json({ status: 'success' })),
        decline: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        list: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        listOffers: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        preview: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        registerRecipient: vi.fn((req, res) => res.status(201).json({ status: 'success' })),
        resend: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        revoke: vi.fn((req, res) => res.status(204).send()),
        verifyRecipient: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    },
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: authMiddleware,
}));

vi.mock('../../middlewares/authorizePlatformPermission.js', () => ({
    authorizePlatformPermission: vi.fn(
        () => permissionMiddleware,
    ),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(
        () => validationMiddleware,
    ),
}));

vi.mock('../../config/commercialInvitationRateLimit.config.js', () => ({
    commercialInvitationRateLimiter: limiterMiddleware,
}));

vi.mock(
    '../../modules/commercialInvitation/commercialInvitation.controller.js',
    () => handlers,
);

const adminApp = express();
adminApp.use(express.json());
adminApp.use('/commercial-invitations', platformCommercialInvitationRouter);

const acceptanceApp = express();
acceptanceApp.use(express.json());
acceptanceApp.use('/commercial-invitations', commercialInvitationAcceptanceRouter);

beforeEach(() => {
    authenticate.mockClear();
    commercialInvitationRateLimiter.mockClear();
    authMiddleware.mockClear();
    limiterMiddleware.mockClear();
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    Object.values(handlers).forEach((handler) => handler.mockClear());
});

describe('platformCommercialInvitationRouter', () => {
    it('protège le catalogue privé de sélection par la permission create', async () => {
        const response = await request(adminApp)
            .get('/commercial-invitations/offers');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_CREATE,
        );
        expect(handlers.listOffers).toHaveBeenCalledOnce();
    });

    it('protège la création par une permission commerciale dédiée et Zod', async () => {
        const response = await request(adminApp)
            .post('/commercial-invitations')
            .send({});

        expect(response.status).toBe(201);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_CREATE,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            body: createCommercialInvitationBodySchema,
        });
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(handlers.create).toHaveBeenCalledOnce();
    });

    it('protège le listing par la permission read dédiée', async () => {
        const response = await request(adminApp)
            .get('/commercial-invitations?page=1&limit=20');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_READ,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            query: paginationQuerySchema,
        });
        expect(handlers.list).toHaveBeenCalledOnce();
    });

    it('utilise des permissions distinctes pour resend et revoke', async () => {
        const invitationId = '507f1f77bcf86cd799439011';

        const resendResponse = await request(adminApp)
            .post(`/commercial-invitations/${invitationId}/resend`);
        const revokeResponse = await request(adminApp)
            .post(`/commercial-invitations/${invitationId}/revoke`)
            .send({ reason: 'Offre retirée' });

        expect(resendResponse.status).toBe(200);
        expect(revokeResponse.status).toBe(204);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_RESEND,
        );
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_REVOKE,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            params: commercialInvitationIdParamsSchema,
        });
        expect(validateRequest).toHaveBeenCalledWith({
            params: commercialInvitationIdParamsSchema,
            body: revokeCommercialInvitationBodySchema,
        });
    });
});

describe('commercialInvitationAcceptanceRouter', () => {
    it('laisse preview sans authentification mais avec rate limit et validation', async () => {
        const response = await request(acceptanceApp)
            .post('/commercial-invitations/preview')
            .send({});

        expect(response.status).toBe(200);
        expect(commercialInvitationRateLimiter).toHaveBeenCalledOnce();
        expect(authenticate).not.toHaveBeenCalled();
        expect(validateRequest).toHaveBeenCalledWith({
            body: previewCommercialInvitationBodySchema,
        });
        expect(handlers.preview).toHaveBeenCalledOnce();
    });

    it('lie l’inscription au token avant toute création de compte', async () => {
        const response = await request(acceptanceApp)
            .post('/commercial-invitations/register')
            .send({});

        expect(response.status).toBe(201);
        expect(commercialInvitationRateLimiter).toHaveBeenCalledOnce();
        expect(authenticate).not.toHaveBeenCalled();
        expect(validateRequest).toHaveBeenCalledWith({
            body: registerCommercialInvitationRecipientBodySchema,
        });
        expect(handlers.registerRecipient).toHaveBeenCalledOnce();
    });

    it('exige Auth pour vérifier le compte bénéficiaire', async () => {
        const response = await request(acceptanceApp)
            .post('/commercial-invitations/recipient')
            .send({});

        expect(response.status).toBe(200);
        expect(commercialInvitationRateLimiter).toHaveBeenCalledOnce();
        expect(authenticate).toHaveBeenCalledOnce();
        expect(validateRequest).toHaveBeenCalledWith({
            body: commercialInvitationRecipientBodySchema,
        });
        expect(handlers.verifyRecipient).toHaveBeenCalledOnce();
    });

    it('exige Auth pour accepter et ne confie jamais l’identité au token seul', async () => {
        const response = await request(acceptanceApp)
            .post('/commercial-invitations/accept')
            .send({});

        expect(response.status).toBe(201);
        expect(commercialInvitationRateLimiter).toHaveBeenCalledOnce();
        expect(authenticate).toHaveBeenCalledOnce();
        expect(validateRequest).toHaveBeenCalledWith({
            body: acceptCommercialInvitationBodySchema,
        });
        expect(handlers.accept).toHaveBeenCalledOnce();
    });

    it('exige Auth pour refuser définitivement l’offre', async () => {
        const response = await request(acceptanceApp)
            .post('/commercial-invitations/decline')
            .send({});

        expect(response.status).toBe(200);
        expect(commercialInvitationRateLimiter).toHaveBeenCalledOnce();
        expect(authenticate).toHaveBeenCalledOnce();
        expect(validateRequest).toHaveBeenCalledWith({
            body: commercialInvitationRecipientBodySchema,
        });
        expect(handlers.decline).toHaveBeenCalledOnce();
    });
});
