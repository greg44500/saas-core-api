import { Router } from 'express';

import {
    CORE_PERMISSION,
} from '../../constants/permissions.constants.js';

import {
    authenticate,
} from '../../middlewares/authenticate.js';

import {
    authorizePermission,
} from '../../middlewares/authorizePermission.js';

import {
    CORE_PLAN_FEATURE,
} from '../plan/planCapability.registry.js';

import {
    enforcePlanFeature,
} from '../../middlewares/enforcePlanFeature.js';

import {
    cleanupTemporaryUploadOnError,
} from '../../middlewares/cleanupTemporaryUploadOnError.js';

import {
    loadWorkspaceContext,
} from '../../middlewares/loadWorkspaceContext.js';

import {
    uploadSingleFile,
} from '../../middlewares/uploadMiddleware.js';

import {
    validateRequest,
} from '../../middlewares/validateRequest.js';

import {
    workspaceIdParamsSchema,
} from '../workspace/workspace.validation.js';

import {
    upload,
} from './file.controller.js';

import {
    uploadFileBodySchema,
} from './file.validation.js';


/*
 * mergeParams conserve le workspaceId déclaré dans le chemin de montage :
 * /api/workspaces/:workspaceId/files.
 *
 * Sans cette option, Express isolerait les paramètres du routeur parent et le
 * module File ne pourrait pas valider ni charger sa frontière multi-tenant.
 */
const router = Router({
    mergeParams: true,
});


/**
 * Téléverse un fichier dans le workspace courant.
 *
 * L'ordre des middlewares est une propriété de sécurité :
 * 1. identifier l'utilisateur ;
 * 2. valider l'identifiant du tenant ;
 * 3. charger son membership et ses permissions ;
 * 4. autoriser l'action file:upload pour son rôle ;
 * 5. vérifier que le plan du workspace inclut file_upload ;
 * 6. seulement ensuite accepter le flux binaire en quarantaine ;
 * 7. valider les métadonnées textuelles extraites du multipart ;
 * 8. persister le résultat inspecté et créer le document File.
 *
 * La permission répond à la question « cet utilisateur peut-il agir ? ».
 * La fonctionnalité du plan répond à la question « ce workspace dispose-t-il
 * de cette capacité ? ». Les deux conditions sont obligatoires.
 *
 * Cette séquence évite d'écrire un fichier temporaire pour une requête non
 * authentifiée, non autorisée ou exclue de l'offre du workspace.
 */
router.post(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.FILE_UPLOAD,
    ),
    enforcePlanFeature(
        CORE_PLAN_FEATURE.FILE_UPLOAD,
    ),
    uploadSingleFile('file'),
    validateRequest({
        body: uploadFileBodySchema,
    }),
    upload,
);


/*
 * Ce middleware d'erreur doit rester après la route d'upload.
 *
 * Si Multer a déjà créé req.file puis qu'une couche suivante échoue, il
 * supprime le temporaire avant de transmettre l'erreur à errorHandler. Les
 * erreurs survenues avant Multer le traversent aussi, mais sans suppression
 * puisque req.file n'existe pas encore.
 */
router.use(cleanupTemporaryUploadOnError);


export { router as fileRouter };