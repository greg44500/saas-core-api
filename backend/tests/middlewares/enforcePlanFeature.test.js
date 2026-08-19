import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    createEnforcePlanFeature,
} from '../../middlewares/enforcePlanFeature.js';


const WORKSPACE_ID =
    '64b64c0f2f4b1a0012345678';


const createRequest = () => ({
    workspace: {
        _id: WORKSPACE_ID,
    },
});


const createPlanEntitlement = ({
    features = ['file_upload'],
} = {}) => ({
    subscription: {
        _id: 'subscription-id',
    },
    plan: {
        _id: 'plan-id',
        features,
    },
});


describe('enforcePlanFeature', () => {
    let resolveWorkspacePlanEntitlement;
    let createMiddleware;


    beforeEach(() => {
        resolveWorkspacePlanEntitlement =
            vi.fn().mockResolvedValue(
                createPlanEntitlement(),
            );

        createMiddleware =
            createEnforcePlanFeature({
                resolveWorkspacePlanEntitlement,
            });
    });


    it('autorise une fonctionnalité incluse dans le plan', async () => {
        const req = createRequest();
        const next = vi.fn();

        const middleware =
            createMiddleware('file_upload');

        await middleware(req, {}, next);

        expect(
            resolveWorkspacePlanEntitlement,
        ).toHaveBeenCalledOnce();

        expect(
            resolveWorkspacePlanEntitlement,
        ).toHaveBeenCalledWith({
            workspaceId: WORKSPACE_ID,
        });

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();

        expect(req.planEntitlement).toEqual(
            createPlanEntitlement(),
        );
    });


    it('refuse une fonctionnalité absente du plan', async () => {
        resolveWorkspacePlanEntitlement
            .mockResolvedValue(
                createPlanEntitlement({
                    features: [
                        'team_management',
                    ],
                }),
            );

        const req = createRequest();
        const next = vi.fn();

        const middleware =
            createMiddleware('file_upload');

        await middleware(req, {}, next);

        const error =
            next.mock.calls[0][0];

        expect(error).toMatchObject({
            message:
                'Cette fonctionnalité n’est pas incluse dans le plan du workspace.',
            statusCode: 403,
        });

        expect(req.planEntitlement)
            .toBeUndefined();
    });


    it('refuse par défaut un plan dont les fonctionnalités sont invalides', async () => {
        resolveWorkspacePlanEntitlement
            .mockResolvedValue({
                subscription: {
                    _id: 'subscription-id',
                },
                plan: {
                    _id: 'plan-id',
                    features: null,
                },
            });

        const next = vi.fn();

        const middleware =
            createMiddleware('file_upload');

        await middleware(
            createRequest(),
            {},
            next,
        );

        expect(
            next.mock.calls[0][0],
        ).toMatchObject({
            message:
                'Les fonctionnalités du plan sont indisponibles.',
            statusCode: 500,
        });
    });


    it('refuse une exécution sans contexte workspace', async () => {
        const next = vi.fn();

        const middleware =
            createMiddleware('file_upload');

        await middleware({}, {}, next);

        expect(
            resolveWorkspacePlanEntitlement,
        ).not.toHaveBeenCalled();

        expect(
            next.mock.calls[0][0],
        ).toMatchObject({
            message:
                'Le contexte du workspace est indisponible.',
            statusCode: 500,
        });
    });


    it('transmet sans la transformer une erreur de SubscriptionService', async () => {
        const subscriptionError =
            new Error(
                'Subscription unavailable',
            );

        resolveWorkspacePlanEntitlement
            .mockRejectedValue(
                subscriptionError,
            );

        const next = vi.fn();

        const middleware =
            createMiddleware('file_upload');

        await middleware(
            createRequest(),
            {},
            next,
        );

        expect(next).toHaveBeenCalledWith(
            subscriptionError,
        );
    });


    it('refuse une clé de fonctionnalité invalide dès la configuration', () => {
        expect(() => {
            createMiddleware(
                '../file_upload',
            );
        }).toThrow(
            'La clé de fonctionnalité du plan est invalide.',
        );

        expect(
            resolveWorkspacePlanEntitlement,
        ).not.toHaveBeenCalled();
    });


    it('refuse une dépendance de résolution invalide', () => {
        expect(() => {
            createEnforcePlanFeature({
                resolveWorkspacePlanEntitlement:
                    null,
            });
        }).toThrow(
            'Le résolveur des droits du plan est invalide.',
        );
    });

});