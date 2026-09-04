import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    createPlatformEntitlementOverride,
    listPlatformEntitlementOverrides,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.service.js';
import {
    getPlatformEntitlementContext,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementContext.service.js';
import {
    createEntitlementOverride,
    getEntitlementContext,
    listEntitlementOverrides,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.controller.js';

vi.mock(
    '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.service.js',
    () => ({
        createPlatformEntitlementOverride: vi.fn(),
        getPlatformEntitlementOverrideById: vi.fn(),
        listPlatformEntitlementOverrides: vi.fn(),
        revokePlatformEntitlementOverride: vi.fn(),
        updatePlatformEntitlementOverride: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/platform/entitlementOverrides/platformEntitlementContext.service.js',
    () => ({
        getPlatformEntitlementContext: vi.fn(),
    }),
);


const createResponse = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});


describe('platformEntitlementOverrides.controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('délègue la création avec acteur et contexte de requête', async () => {
        const override = {
            id: '507f1f77bcf86cd799439012',
            lifecycle: 'active',
        };
        const req = {
            validated: {
                body: {
                    workspaceId: '507f1f77bcf86cd799439011',
                    targetType: 'feature',
                    featureKey: 'file_upload',
                    featureEnabled: true,
                    source: 'support',
                    reason: 'Accès temporaire',
                },
            },
            user: {
                _id: '507f1f77bcf86cd799439013',
            },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
            },
        };
        const res = createResponse();

        createPlatformEntitlementOverride.mockResolvedValue(override);

        await createEntitlementOverride(req, res);

        expect(createPlatformEntitlementOverride).toHaveBeenCalledWith({
            overrideData: req.validated.body,
            actorId: req.user._id,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { override },
        });
    });

    it('retourne la pagination du service sans la recalculer', async () => {
        const req = {
            validated: {
                query: {
                    page: 2,
                    limit: 10,
                    workspaceId: '507f1f77bcf86cd799439011',
                },
            },
        };
        const res = createResponse();
        const overrides = [{ id: 'override-1' }];
        const pagination = {
            page: 2,
            limit: 10,
            total: 11,
            totalPages: 2,
        };

        listPlatformEntitlementOverrides.mockResolvedValue({
            overrides,
            pagination,
        });

        await listEntitlementOverrides(req, res);

        expect(listPlatformEntitlementOverrides).toHaveBeenCalledWith(
            req.validated.query,
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { overrides },
            meta: pagination,
        });
    });

    it('retourne le contexte entitlement Platform du workspace', async () => {
        const req = {
            validated: {
                params: {
                    workspaceId: '507f1f77bcf86cd799439011',
                },
            },
        };
        const res = createResponse();
        const context = {
            workspace: {
                id: req.validated.params.workspaceId,
                name: 'Workspace Démo',
            },
        };

        getPlatformEntitlementContext.mockResolvedValue(context);

        await getEntitlementContext(req, res);

        expect(getPlatformEntitlementContext).toHaveBeenCalledWith({
            workspaceId: req.validated.params.workspaceId,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { context },
        });
    });
});
