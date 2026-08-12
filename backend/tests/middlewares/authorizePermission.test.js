import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { authorizePermission } from '../../middlewares/authorizePermission.js';


describe('authorizePermission', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('autorise la requête lorsque la permission requise est présente', () => {
        const req = {
            permissions: [
                'workspace:read',
                'member:read',
            ],
        };

        const next = vi.fn();

        const middleware = authorizePermission('member:read');

        middleware(req, {}, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
    });


    it('refuse la requête lorsque la permission requise est absente', () => {
        const req = {
            permissions: [
                'workspace:read',
            ],
        };

        const next = vi.fn();

        const middleware = authorizePermission('member:read');

        middleware(req, {}, next);

        expect(next).toHaveBeenCalledOnce();

        const error = next.mock.calls[0][0];

        expect(error).toEqual(
            expect.objectContaining({
                statusCode: 403,
            }),
        );
    });


    it('refuse la requête lorsque le contexte de permissions est absent', () => {
        const req = {};

        const next = vi.fn();

        const middleware = authorizePermission('member:read');

        middleware(req, {}, next);

        expect(next).toHaveBeenCalledOnce();

        const error = next.mock.calls[0][0];

        expect(error).toEqual(
            expect.objectContaining({
                statusCode: 403,
            }),
        );
    });
});