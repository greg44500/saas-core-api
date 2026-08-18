import {
    fileService,
} from './file.service.js';


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


export { upload };
