import { unlink } from 'node:fs/promises';

import express from 'express';
import supertest from 'supertest';

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { env } from '../../config/env.js';
import { multerUpload } from '../../config/multer.config.js';

import {
    errorHandler,
} from '../../middlewares/errorHandler.js';

import {
    createUploadSingleFile,
} from '../../middlewares/uploadMiddleware.js';

import {
    AUDIT_ACTION,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import {
    FILE_UPLOAD_REJECTION_REASON,
} from '../../constants/fileAudit.constants.js';


const createAuditEvent = vi.fn(
    async () => ({}),
);


/**
 * Application Express minimale dédiée aux tests multipart.
 *
 * Le vrai middleware Multer est conservé afin de tester réellement les
 * limites multipart. Seule la persistance AuditLog est remplacée par une
 * dépendance contrôlée pour éviter toute écriture en base.
 */
const createTestApp = () => {
    const app = express();

    const uploadSingleFileForTest =
        createUploadSingleFile({
            upload: multerUpload,
            createAuditEvent,
        });
    app.use(
        (request, response, next) => {
            request.user = {
                _id: 'user-id',
            };

            request.workspace = {
                _id: 'workspace-id',
            };

            request.context = {
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
            };

            next();
        },
    );
    app.post(
        '/upload',
        uploadSingleFileForTest('file'),

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


beforeEach(() => {
    createAuditEvent.mockClear();
});


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
        expect(createAuditEvent)
            .toHaveBeenCalledOnce();

        expect(createAuditEvent)
            .toHaveBeenCalledWith({
                actor: 'user-id',
                workspace: 'workspace-id',
                action:
                    AUDIT_ACTION.FILE_UPLOAD_REJECTED,
                status:
                    AUDIT_STATUS.FAILED,
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
                metadata: {
                    reason:
                        FILE_UPLOAD_REJECTION_REASON
                            .FILE_TOO_LARGE,
                },
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


    it('refuse une dépendance Multer invalide', () => {
        expect(
            () =>
                createUploadSingleFile({
                    upload: null,
                    createAuditEvent: vi.fn(),
                }),
        ).toThrow(
            'Les dépendances du middleware d’upload sont invalides.',
        );
    });


    it('construit le middleware avec la dépendance Multer injectée', () => {
        const multerMiddleware = vi.fn();

        const upload = {
            single: vi.fn(
                () => multerMiddleware,
            ),
        };

        const createUpload =
            createUploadSingleFile({
                upload,
                createAuditEvent: vi.fn(),
            });

        const middleware =
            createUpload('document');

        expect(upload.single)
            .toHaveBeenCalledOnce();

        expect(upload.single)
            .toHaveBeenCalledWith(
                'document',
            );

        expect(middleware)
            .toBeTypeOf('function');
    });

    it('conserve le rejet du fichier lorsque son audit échoue', async () => {
        createAuditEvent.mockRejectedValueOnce(
            new Error('Audit indisponible'),
        );

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

        expect(createAuditEvent)
            .toHaveBeenCalledOnce();

        expect(response.status).toBe(413);

        expect(response.body).toEqual({
            status: 'fail',
            message:
                'Le fichier dépasse la taille maximale autorisée.',
        });
    });
});