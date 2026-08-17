import { unlink } from 'node:fs/promises';

import express from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { env } from '../../config/env.js';
import { errorHandler } from '../../middlewares/errorHandler.js';

import {
    uploadSingleFile,
} from '../../middlewares/uploadMiddleware.js';


/**
 * Application Express minimale dédiée aux tests multipart.
 */
const createTestApp = () => {
    const app = express();

    app.post(
        '/upload',
        uploadSingleFile('file'),

        /**
         * Un upload accepté est immédiatement supprimé afin que le test ne
         * laisse aucun fichier temporaire sur la machine.
         */
        async (request, response) => {
            await unlink(request.file.path);

            response.status(204).end();
        },
    );

    app.use(errorHandler);

    return app;
};


describe('Upload middleware', () => {
    it('refuse une requête ne contenant aucun fichier', async () => {
        const response = await supertest(createTestApp())
            .post('/upload');

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            status: 'fail',
            message:
                'Aucun fichier valide n’a été fourni.',
        });
    });


    it('refuse un fichier dépassant la taille maximale', async () => {
        const oversizedContent = Buffer.alloc(
            env.UPLOAD_MAX_FILE_SIZE_BYTES + 1,
        );

        const response = await supertest(createTestApp())
            .post('/upload')
            .attach(
                'file',
                oversizedContent,
                {
                    filename: 'oversized.pdf',
                    contentType: 'application/pdf',
                },
            );

        expect(response.status).toBe(413);

        expect(response.body).toEqual({
            status: 'fail',
            message:
                'Le fichier dépasse la taille maximale autorisée.',
        });
    });


    it('refuse un type MIME déclaré hors de la liste autorisée', async () => {
        const response = await supertest(createTestApp())
            .post('/upload')
            .attach(
                'file',
                Buffer.from('contenu texte'),
                {
                    filename: 'document.txt',
                    contentType: 'text/plain',
                },
            );

        expect(response.status).toBe(415);

        expect(response.body).toEqual({
            status: 'fail',
            message:
                'Le type de fichier déclaré n’est pas autorisé.',
        });
    });
});