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
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';

import {
    workspaceIdParamsSchema,
} from '../workspace/workspace.validation.js';

import {
    download,
    getById,
    list,
    upload,
} from './file.controller.js';

import {
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
        query: paginationQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.FILE_READ),
    list,
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
