import { pipeline } from 'node:stream/promises';

import {
    fileService,
} from './file.service.js';
import {
    getWorkspaceFile,
    listWorkspaceFiles,
    openWorkspaceFileDownload,
} from './fileRead.service.js';


/**
 * Reçoit un fichier déjà déposé en quarantaine et demande sa persistance.
 *
 * Les middlewares exécutés avant ce contrôleur garantissent :
 * - l'identité de req.user ;
 * - l'existence et l'accessibilité de req.workspace ;
 * - la permission file:upload ;
 * - la présence de req.file ;
 * - la validité de req.validated.body.category.
 *
 * Le contrôleur ne répète pas ces responsabilités. Il traduit le contexte
 * HTTP en paramètres de service, puis construit le contrat JSON public.
 */
const upload = async (request, response) => {
    const file =
        await fileService.persistUploadedFile({
            /*
             * Le workspace chargé par loadWorkspaceContext est utilisé à la
             * place de la valeur brute de l'URL : il constitue la frontière
             * multi-tenant déjà vérifiée pour l'utilisateur courant.
             */
            workspaceId: request.workspace._id,

            /*
             * L'identité de l'auteur provient exclusivement du middleware
             * authenticate. Le client ne peut jamais choisir uploadedBy.
             */
            uploadedBy: request.user._id,

            file: request.file,
            category:
                request.validated.body.category,
            ipAddress: request.context.ipAddress,
            userAgent: request.context.userAgent,
        });

    response.status(201).json({
        status: 'success',
        data: {
            file: {
                id: file._id.toString(),
                originalName: file.originalName,
                mimeType: file.mimeType,
                extension: file.extension,
                sizeBytes: file.sizeBytes,
                category: file.category,
                status: file.status,
                createdAt: file.createdAt,
                updatedAt: file.updatedAt,
            },
        },
    });
};

const list = async (request, response) => {
    const {
        files,
        pagination,
    } = await listWorkspaceFiles({
        workspaceId: request.workspace._id,
        page: request.validated.query.page,
        limit: request.validated.query.limit,
    });

    response.status(200).json({
        status: 'success',
        data: { files },
        meta: pagination,
    });
};

const getById = async (request, response) => {
    const file = await getWorkspaceFile({
        workspaceId: request.workspace._id,
        fileId: request.validated.params.fileId,
    });

    response.status(200).json({
        status: 'success',
        data: { file },
    });
};

const download = async (request, response) => {
    const {
        file,
        stream,
    } = await openWorkspaceFileDownload({
        workspaceId: request.workspace._id,
        fileId: request.validated.params.fileId,
    });

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.sizeBytes));

    /*
     * filename* encode le nom fourni lors de l'upload sans réinjecter de
     * caractères de contrôle dans l'en-tête HTTP. La clé de stockage interne
     * n'est jamais exposée au client.
     */
    response.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );

    await pipeline(stream, response);
};


export {
    download,
    getById,
    list,
    upload,
};
