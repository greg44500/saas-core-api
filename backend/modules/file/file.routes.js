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
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';

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
    download,
    getById,
    getStorageUsage,
    list,
    listTrash,
    remove,
    restore,
    upload,
} from './file.controller.js';

import {
    listWorkspaceFilesQuerySchema,
    uploadFileBodySchema,
    workspaceFileParamsSchema,
} from './file.validation.js';

const router = Router({
    mergeParams: true,
});

/**
 * Les lectures n'augmentent aucune consommation et restent accessibles en
 * remédiation. Elles ne dépendent pas non plus de la feature file_upload : un
 * plan qui interdit de nouveaux dépôts ne doit pas masquer les fichiers actifs
 * déjà possédés par le workspace.
 */
router.get(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: listWorkspaceFilesQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.FILE_READ),
    list,
);

/**
 * La consommation de stockage est une information de lecture du domaine File.
 * Elle est déclarée avant /:fileId pour ne jamais interpréter "storage" comme
 * un identifiant de fichier et reste visible pendant une remédiation de quota.
 */
router.get(
    '/storage',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.FILE_READ),
    getStorageUsage,
);

/**
 * La corbeille est une surface d'administration distincte du listing actif.
 * Elle doit être déclarée avant /:fileId afin que "trash" ne puisse jamais être
 * interprété comme un identifiant de fichier.
 */
router.get(
    '/trash',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: listWorkspaceFilesQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.FILE_TRASH_READ),
    listTrash,
);

router.get(
    '/:fileId/download',
    authenticate,
    validateRequest({
        params: workspaceFileParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.FILE_READ),
    download,
);

/**
 * Restaurer ne crée pas de nouvelle consommation : le fichier supprimé reste
 * comptabilisé jusqu'à sa purge. L'action reste donc autorisée en remédiation,
 * sous réserve de la permission dédiée et de l'absence de purge en cours.
 */
router.post(
    '/:fileId/restore',
    authenticate,
    validateRequest({
        params: workspaceFileParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.FILE_RESTORE),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    restore,
);

router.get(
    '/:fileId',
    authenticate,
    validateRequest({
        params: workspaceFileParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.FILE_READ),
    getById,
);

/**
 * La suppression logique libère l'accès fonctionnel mais pas encore le stockage :
 * le contenu physique reste conservé jusqu'à la purge différée. L'action reste
 * néanmoins corrective en remédiation puisqu'elle prépare cette libération.
 */
router.delete(
    '/:fileId',
    authenticate,
    validateRequest({
        params: workspaceFileParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.FILE_DELETE),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    remove,
);

/**
 * Téléverse un fichier dans le workspace courant.
 *
 * La permission utilisateur est vérifiée avant l'état commercial du workspace.
 * En remédiation, un nouvel upload pourrait augmenter le stockage ou les
 * compteurs de consommation : il est donc refusé avant même l'écriture du
 * fichier temporaire.
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
    enforceWorkspaceAccessMode(),
    enforcePlanFeature(
        CORE_PLAN_FEATURE.FILE_UPLOAD,
    ),
    uploadSingleFile('file'),
    validateRequest({
        body: uploadFileBodySchema,
    }),
    upload,
);

router.use(cleanupTemporaryUploadOnError);

export { router as fileRouter };
