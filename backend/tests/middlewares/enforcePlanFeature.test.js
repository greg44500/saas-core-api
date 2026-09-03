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


const createEffectiveEntitlement = ({
    features = ['file_upload'],
} = {}) => ({
    subscription: {
        _id: 'subscription-id',
    },
    plan: {
        _id: 'plan-id',
        features: ['file_upload'],
    },
    effectiveCapabilities: {
        features,
        limits: {},
        appliedOverrides: [],
    },
});


describe('enforcePlanFeature', () => {
    let resolveWorkspaceEffectiveEntitlement;
    let createMiddleware;


    beforeEach(() => {
        resolveWorkspaceEffectiveEntitlement =
            vi.fn().mockResolvedValue(
                createEffectiveEntitlement(),
            );

        createMiddleware =
            createEnforcePlanFeature({
                resolveWorkspaceEffectiveEntitlement,
            });
    });


    it('autorise une fonctionnalité présente dans l’entitlement effectif', async () => {
        const req = createRequest();
        const next = vi.fn();

        const middleware =
            createMiddleware('file_upload');

        await middleware(req, {}, next);

        expect(
            resolveWorkspaceEffectiveEntitlement,
        ).toHaveBeenCalledOnce();

        expect(
            resolveWorkspaceEffectiveEntitlement,
        ).toHaveBeenCalledWith({
            workspaceId: WORKSPACE_ID,
        });

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();

        expect(req.effectiveEntitlement).toEqual(
            createEffectiveEntitlement(),
        );
    });


    it('réutilise le workspaceAccess déjà résolu sans relire MongoDB', async () => {
        const workspaceAccess =
            createEffectiveEntitlement();
        const req = {
            ...createRequest(),
            workspaceAccess,
        };
        const next = vi.fn();

        const middleware =
            createMiddleware('file_upload');

        await middleware(req, {}, next);

        expect(
            resolveWorkspaceEffectiveEntitlement,
        ).not.toHaveBeenCalled();
        expect(req.effectiveEntitlement)
            .toBe(workspaceAccess);
        expect(next).toHaveBeenCalledWith();
    });


    it('refuse une fonctionnalité retirée de l’entitlement par override', async () => {
        resolveWorkspaceEffectiveEntitlement
            .mockResolvedValue(
                createEffectiveEntitlement({
                    features: [],
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
                'Cette fonctionnalité n’est pas disponible pour ce workspace.',
            statusCode: 403,
        });

        expect(req.effectiveEntitlement)
            .toBeUndefined();
    });


    it('refuse un entitlement dont les fonctionnalités effectives sont invalides', async () => {
        resolveWorkspaceEffectiveEntitlement
            .mockResolvedValue({
                subscription: {
                    _id: 'subscription-id',
                },
                plan: {
                    _id: 'plan-id',
                },
                effectiveCapabilities: {
                    features: null,
                    limits: {},
                    appliedOverrides: [],
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
                'Les fonctionnalités effectives du workspace sont indisponibles.',
            statusCode: 500,
        });
    });


    it('refuse une exécution sans contexte workspace', async () => {
        const next = vi.fn();

        const middleware =
            createMiddleware('file_upload');

        await middleware({}, {}, next);

        expect(
            resolveWorkspaceEffectiveEntitlement,
        ).not.toHaveBeenCalled();

        expect(
            next.mock.calls[0][0],
        ).toMatchObject({
            message:
                'Le contexte du workspace est indisponible.',
            statusCode: 500,
        });
    });


    it('transmet sans la transformer une erreur du moteur d’entitlement', async () => {
        const entitlementError =
            new Error(
                'Effective entitlement unavailable',
            );

        resolveWorkspaceEffectiveEntitlement
            .mockRejectedValue(
                entitlementError,
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
            entitlementError,
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
            resolveWorkspaceEffectiveEntitlement,
        ).not.toHaveBeenCalled();
    });


    it('refuse une dépendance de résolution invalide', () => {
        expect(() => {
            createEnforcePlanFeature({
                resolveWorkspaceEffectiveEntitlement:
                    null,
            });
        }).toThrow(
            'Le résolveur des droits effectifs est invalide.',
        );
    });

});