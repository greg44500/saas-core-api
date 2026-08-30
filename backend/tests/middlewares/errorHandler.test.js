import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    buildSafeErrorLog,
    errorHandler,
} from '../../middlewares/errorHandler.js';

const createResponse = () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });

    return {
        response: { status },
        status,
        json,
    };
};

describe('errorHandler', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('expose le message contrôlé d’une erreur opérationnelle', () => {
        const error = Object.assign(
            new Error('Accès refusé'),
            {
                statusCode: 403,
                status: 'fail',
                isOperational: true,
            },
        );
        const { response, status, json } = createResponse();
        const consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        errorHandler(error, { context: {} }, response, vi.fn());

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({
            status: 'fail',
            message: 'Accès refusé',
        });
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('masque une erreur interne et ne journalise pas ses propriétés arbitraires', () => {
        const error = Object.assign(
            new Error('database unavailable'),
            {
                config: {
                    authorization: 'Bearer secret-token',
                },
                password: 'should-never-be-logged',
            },
        );
        const { response, status, json } = createResponse();
        const consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        errorHandler(
            error,
            {
                context: {
                    requestId: 'request-123',
                },
            },
            response,
            vi.fn(),
        );

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Une erreur interne est survenue',
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Unhandled application error',
            {
                requestId: 'request-123',
                name: 'Error',
                message: 'database unavailable',
            },
        );

        const loggedPayload = consoleErrorSpy.mock.calls[0][1];
        expect(loggedPayload).not.toHaveProperty('config');
        expect(loggedPayload).not.toHaveProperty('password');
        expect(loggedPayload).not.toHaveProperty('stack');
    });
});

describe('buildSafeErrorLog', () => {
    it('produit une structure minimale pour une valeur non standard', () => {
        expect(
            buildSafeErrorLog({}, 'request-456'),
        ).toEqual({
            requestId: 'request-456',
            name: 'Error',
            message: 'Unknown error',
        });
    });
});