import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { authorizeWorkspaceOwner } from '../../middlewares/authorizeWorkspaceOwner.js';

const runMiddleware = (role) => {
    const req = { role };
    const next = vi.fn();

    authorizeWorkspaceOwner(req, {}, next);

    return next;
};

describe('authorizeWorkspaceOwner', () => {
    it('autorise uniquement le rôle système owner', () => {
        const next = runMiddleware({
            key: 'owner',
            isSystem: true,
        });

        expect(next).toHaveBeenCalledWith();
    });

    it('refuse un admin même s’il possède toutes les permissions', () => {
        const next = runMiddleware({
            key: 'admin',
            isSystem: true,
            permissions: ['subscription:read'],
        });

        const [error] = next.mock.calls[0];
        expect(error.statusCode).toBe(403);
    });

    it('refuse un rôle owner non système', () => {
        const next = runMiddleware({
            key: 'owner',
            isSystem: false,
        });

        const [error] = next.mock.calls[0];
        expect(error.statusCode).toBe(403);
    });
});
