import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    transferWorkspaceOwnership,
} from '../../modules/workspace/transferWorkspaceOwnership.service.js';
import {
    transferOwnership,
} from '../../modules/workspace/workspaceOwnership.controller.js';


vi.mock(
    '../../modules/workspace/transferWorkspaceOwnership.service.js',
    () => ({
        transferWorkspaceOwnership: vi.fn(),
    }),
);


describe('transferOwnership controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('transmet uniquement le contexte fiable et le body validé au service', async () => {
        transferWorkspaceOwnership.mockResolvedValue({
            previousOwner: {
                _id: {
                    toString: () => 'previous-owner-member-id',
                },
            },
            newOwner: {
                _id: {
                    toString: () => 'new-owner-member-id',
                },
            },
        });

        const req = {
            workspace: {
                _id: 'workspace-id',
            },
            user: {
                id: 'actor-id',
            },
            validated: {
                body: {
                    newOwnerMemberId: 'new-owner-member-id',
                    previousOwnerRoleId: 'replacement-role-id',
                    currentPassword:
                        'Correct Horse Battery Staple',
                },
            },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
            },
        };

        const json = vi.fn();
        const status = vi.fn(() => ({ json }));
        const res = { status };

        await transferOwnership(req, res);

        expect(
            transferWorkspaceOwnership,
        ).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            newOwnerMemberId: 'new-owner-member-id',
            previousOwnerRoleId: 'replacement-role-id',
            currentPassword:
                'Correct Horse Battery Staple',
            actorId: 'actor-id',
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                ownership: {
                    previousOwnerMemberId:
                        'previous-owner-member-id',
                    newOwnerMemberId:
                        'new-owner-member-id',
                },
            },
        });
    });
});
