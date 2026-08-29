import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    WORKSPACE_ACCESS_MODE,
} from '../../constants/workspaceAccess.constants.js';
import {
    createEnforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';

const createRequest = () => ({
    workspace: {
        _id: 'workspace-id',
    },
});

const createResponse = () => ({});

describe('enforceWorkspaceAccessMode', () => {
    it('autorise une action normale lorsque le workspace est conforme', async () => {
        const resolveWorkspaceAccessEntitlement = vi.fn()
            .mockResolvedValue({
                accessMode: WORKSPACE_ACCESS_MODE.NORMAL,
                blockingLimits: [],
            });
        const middleware = createEnforceWorkspaceAccessMode({
            resolveWorkspaceAccessEntitlement,
        })();
        const req = createRequest();
        const next = vi.fn();

        await middleware(req, createResponse(), next);

        expect(resolveWorkspaceAccessEntitlement)
            .toHaveBeenCalledWith({
                workspaceId: 'workspace-id',
            });
        expect(req.workspaceAccess.accessMode)
            .toBe(WORKSPACE_ACCESS_MODE.NORMAL);
        expect(next).toHaveBeenCalledWith();
    });

    it('refuse par défaut une mutation métier en remédiation', async () => {
        const resolveWorkspaceAccessEntitlement = vi.fn()
            .mockResolvedValue({
                accessMode: WORKSPACE_ACCESS_MODE.REMEDIATION,
                reason: 'plan_limits_exceeded',
                blockingLimits: [
                    {
                        key: 'members',
                        usage: 8,
                        limit: 5,
                    },
                ],
            });
        const middleware = createEnforceWorkspaceAccessMode({
            resolveWorkspaceAccessEntitlement,
        })();
        const next = vi.fn();

        await middleware(createRequest(), createResponse(), next);

        expect(next).toHaveBeenCalledOnce();
        expect(next.mock.calls[0][0]).toMatchObject({
            statusCode: 403,
        });
    });

    it('autorise explicitement une action de remédiation', async () => {
        const resolveWorkspaceAccessEntitlement = vi.fn()
            .mockResolvedValue({
                accessMode: WORKSPACE_ACCESS_MODE.REMEDIATION,
                reason: 'plan_limits_exceeded',
                blockingLimits: [
                    {
                        key: 'storage_bytes',
                        usage: 30,
                        limit: 20,
                    },
                ],
            });
        const middleware = createEnforceWorkspaceAccessMode({
            resolveWorkspaceAccessEntitlement,
        })({
            allowDuringRemediation: true,
        });
        const next = vi.fn();

        await middleware(createRequest(), createResponse(), next);

        expect(next).toHaveBeenCalledWith();
    });

    it('refuse une utilisation avant le chargement du contexte workspace', async () => {
        const resolveWorkspaceAccessEntitlement = vi.fn();
        const middleware = createEnforceWorkspaceAccessMode({
            resolveWorkspaceAccessEntitlement,
        })();
        const next = vi.fn();

        await middleware({}, createResponse(), next);

        expect(resolveWorkspaceAccessEntitlement)
            .not.toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toMatchObject({
            statusCode: 500,
        });
    });

    it('propage une erreur du résolveur', async () => {
        const expectedError = new Error('database unavailable');
        const resolveWorkspaceAccessEntitlement = vi.fn()
            .mockRejectedValue(expectedError);
        const middleware = createEnforceWorkspaceAccessMode({
            resolveWorkspaceAccessEntitlement,
        })();
        const next = vi.fn();

        await middleware(createRequest(), createResponse(), next);

        expect(next).toHaveBeenCalledWith(expectedError);
    });

    it('valide strictement la configuration de la factory', () => {
        expect(() => createEnforceWorkspaceAccessMode({
            resolveWorkspaceAccessEntitlement: null,
        })).toThrow(TypeError);

        const factory = createEnforceWorkspaceAccessMode({
            resolveWorkspaceAccessEntitlement: vi.fn(),
        });

        expect(() => factory({
            allowDuringRemediation: 'yes',
        })).toThrow(TypeError);
    });
});
