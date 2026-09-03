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
} from '../../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE,
} from '../../../constants/platformRoles.constants.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import {
    authorizePlatformPermission,
} from '../../../middlewares/authorizePlatformPermission.js';
import {
    validateRequest,
} from '../../../middlewares/validateRequest.js';
import {
    platformRouter,
} from '../../../modules/platform/platform.routes.js';
import {
    createPlatformEntitlementOverrideBodySchema,
    listPlatformEntitlementOverridesQuerySchema,
    platformEntitlementOverrideIdParamsSchema,
    revokePlatformEntitlementOverrideBodySchema,
    updatePlatformEntitlementOverrideBodySchema,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.validation.js';


const {
    permissionMiddleware,
    validationMiddleware,
    handlers,
} = vi.hoisted(() => ({
    permissionMiddleware: vi.fn(
        (req, res, next) => next(),
    ),
    validationMiddleware: vi.fn(
        (req, res, next) => next(),
    ),
    handlers: {
        listEntitlementOverrides: vi.fn(
            (req, res) => res.status(200).json({ status: 'success' }),
        ),
        getEntitlementOverrideById: vi.fn(
            (req, res) => res.status(200).json({ status: 'success' }),
        ),
        createEntitlementOverride: vi.fn(
            (req, res) => res.status(201).json({ status: 'success' }),
        ),
        updateEntitlementOverride: vi.fn(
            (req, res) => res.status(200).json({ status: 'success' }),
        ),
        revokeEntitlementOverride: vi.fn(
            (req, res) => res.status(200).json({ status: 'success' }),
        ),
    },
}));

vi.mock(
    '../../../middlewares/authenticate.js',
    () => ({
        authenticate: vi.fn(
            (req, res, next) => {
                req.user = {
                    _id: 'user-id',
                    id: 'user-id',
                    platformRole: PLATFORM_ROLE.SUPER_ADMIN,
                };
                next();
            },
        ),
    }),
);

vi.mock(
    '../../../middlewares/authorizePlatformPermission.js',
    () => ({
        authorizePlatformPermission: vi.fn(
            () => permissionMiddleware,
        ),
    }),
);

vi.mock(
    '../../../middlewares/validateRequest.js',
    () => ({
        validateRequest: vi.fn(
            () => validationMiddleware,
        ),
    }),
);

vi.mock(
    '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.controller.js',
    () => handlers,
);

const app = express();
app.use(express.json());
app.use('/platform', platformRouter);

beforeEach(() => {
    authenticate.mockClear();

    /*
     * Les factories authorizePlatformPermission() et validateRequest() sont
     * appelées lors de la construction du routeur, donc au chargement du
     * module. Leur historique doit être conservé pour vérifier le contrat de
     * sécurité déclaré par les routes ; seuls les middlewares effectivement
     * exécutés à chaque requête sont remis à zéro ici.
     */
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    Object.values(handlers).forEach((handler) => handler.mockClear());
});


describe('platformEntitlementOverrides.routes', () => {
    it('protège la liste avec la permission de lecture', async () => {
        const response = await request(app)
            .get('/platform/entitlement-overrides?page=1&limit=20');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            query: listPlatformEntitlementOverridesQuerySchema,
        });
        expect(handlers.listEntitlementOverrides).toHaveBeenCalledOnce();
    });

    it('protège le détail avec la permission de lecture', async () => {
        const overrideId = '507f1f77bcf86cd799439011';

        const response = await request(app)
            .get(`/platform/entitlement-overrides/${overrideId}`);

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            params: platformEntitlementOverrideIdParamsSchema,
        });
        expect(handlers.getEntitlementOverrideById).toHaveBeenCalledOnce();
    });

    it('protège la création avec une permission distincte', async () => {
        const response = await request(app)
            .post('/platform/entitlement-overrides')
            .send({});

        expect(response.status).toBe(201);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_CREATE,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            body: createPlatformEntitlementOverrideBodySchema,
        });
        expect(handlers.createEntitlementOverride).toHaveBeenCalledOnce();
    });

    it('protège la modification avec la permission update', async () => {
        const overrideId = '507f1f77bcf86cd799439011';

        const response = await request(app)
            .patch(`/platform/entitlement-overrides/${overrideId}`)
            .send({});

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_UPDATE,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            params: platformEntitlementOverrideIdParamsSchema,
            body: updatePlatformEntitlementOverrideBodySchema,
        });
        expect(handlers.updateEntitlementOverride).toHaveBeenCalledOnce();
    });

    it('protège la révocation avec sa permission dédiée', async () => {
        const overrideId = '507f1f77bcf86cd799439011';

        const response = await request(app)
            .patch(`/platform/entitlement-overrides/${overrideId}/revoke`)
            .send({});

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_REVOKE,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            params: platformEntitlementOverrideIdParamsSchema,
            body: revokePlatformEntitlementOverrideBodySchema,
        });
        expect(handlers.revokeEntitlementOverride).toHaveBeenCalledOnce();
    });
});
