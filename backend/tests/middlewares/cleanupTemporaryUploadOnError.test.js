import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    createCleanupTemporaryUploadOnError,
} from '../../middlewares/cleanupTemporaryUploadOnError.js';


const TEMPORARY_FILE_PATH =
    '/temporary/uploaded-file';


const createMiddlewareContext = ({
    filePath,
} = {}) => ({
    request: filePath
        ? {
            file: {
                path: filePath,
            },
        }
        : {},
    response: {},
    next: vi.fn(),
});


describe('Cleanup temporary upload on error', () => {
    it('transmet directement l’erreur lorsqu’aucun temporaire n’a été créé', async () => {
        const discardTemporaryFile =
            vi.fn();

        const middleware =
            createCleanupTemporaryUploadOnError({
                discardTemporaryFile,
            });

        const processingError =
            new Error('Request failed');

        const {
            request,
            response,
            next,
        } = createMiddlewareContext();

        await middleware(
            processingError,
            request,
            response,
            next,
        );

        expect(
            discardTemporaryFile,
        ).not.toHaveBeenCalled();

        expect(next).toHaveBeenCalledWith(
            processingError,
        );
    });


    it('détruit le temporaire avant de propager l’erreur initiale', async () => {
        const discardTemporaryFile =
            vi.fn().mockResolvedValue({
                discarded: true,
            });

        const middleware =
            createCleanupTemporaryUploadOnError({
                discardTemporaryFile,
            });

        const processingError =
            new Error('Validation failed');

        const {
            request,
            response,
            next,
        } = createMiddlewareContext({
            filePath: TEMPORARY_FILE_PATH,
        });

        await middleware(
            processingError,
            request,
            response,
            next,
        );

        expect(
            discardTemporaryFile,
        ).toHaveBeenCalledWith(
            TEMPORARY_FILE_PATH,
        );

        expect(next).toHaveBeenCalledWith(
            processingError,
        );
    });


    it('conserve les erreurs de traitement et de nettoyage dans un AggregateError', async () => {
        const processingError =
            new Error('Validation failed');

        const cleanupError =
            new Error('Cleanup failed');

        const discardTemporaryFile =
            vi.fn().mockRejectedValue(
                cleanupError,
            );

        const middleware =
            createCleanupTemporaryUploadOnError({
                discardTemporaryFile,
            });

        const {
            request,
            response,
            next,
        } = createMiddlewareContext({
            filePath: TEMPORARY_FILE_PATH,
        });

        await middleware(
            processingError,
            request,
            response,
            next,
        );

        const aggregateError =
            next.mock.calls[0][0];

        expect(aggregateError)
            .toBeInstanceOf(AggregateError);

        expect(aggregateError.errors).toEqual([
            processingError,
            cleanupError,
        ]);

        expect(aggregateError.cause)
            .toBe(processingError);
    });


    it('refuse une factory dépourvue de dépendance de nettoyage', () => {
        expect(() =>
            createCleanupTemporaryUploadOnError({}),
        ).toThrow(
            'La dépendance de nettoyage du fichier temporaire est invalide.',
        );
    });
});