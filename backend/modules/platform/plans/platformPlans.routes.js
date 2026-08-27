import { Router } from 'express';

import {
    PLATFORM_ROLE,
} from '../../../constants/platformRoles.constants.js';

import {
    authorizePlatformRole,
} from '../../../middlewares/authorizePlatformRole.js';

import {
    validateRequest,
} from '../../../middlewares/validateRequest.js';

import {
    paginationQuerySchema,
} from '../../../utils/validations/pagination.validation.js';

import {
    archivePlan,
    createPlan,
    listPlans,
    updatePlan,
} from './platformPlans.controller.js';

import {
    createPlatformPlanBodySchema,
    platformPlanIdParamsSchema,
    updatePlatformPlanBodySchema
} from './platformPlans.validation.js';


const platformPlansRouter = Router();


/**
 * Toutes les routes d'administration des plans sont réservées au super-admin.
 *
 * L'authentification est déjà appliquée par le routeur Platform racine.
 * Ce sous-routeur reste responsable de l'autorisation propre au domaine Plans.
 */
platformPlansRouter.use(
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
);


/**
 * Retourne la liste administrative paginée des plans.
 *
 * Contrairement au catalogue public, cette route peut exposer des plans
 * privés, inactifs ou archivés nécessaires à l'administration Platform.
 */
platformPlansRouter.get(
    '/',
    validateRequest({
        query: paginationQuerySchema,
    }),
    listPlans,
);


/**
 * Crée une nouvelle offre commerciale depuis l'administration Platform.
 *
 * La validation HTTP protège la structure du payload avant son passage
 * au service. Les capabilities sont ensuite contrôlées par le module Plan,
 * qui reste propriétaire de cette règle métier.
 */
platformPlansRouter.post(
    '/',
    validateRequest({
        body: createPlatformPlanBodySchema,
    }),
    createPlan,
);

/**
 * Met à jour partiellement un plan existant.
 *
 * L'identifiant et le payload sont validés séparément afin de conserver
 * un contrat HTTP explicite sur chaque source de données.
 */
platformPlansRouter.patch(
    '/:planId',
    validateRequest({
        params: platformPlanIdParamsSchema,
        body: updatePlatformPlanBodySchema,
    }),
    updatePlan,
);

/**
 * Archive un plan existant.
 *
 * L'archivage est exposé comme une action dédiée afin de conserver
 * une transition métier explicite et auditée séparément.
 */
platformPlansRouter.patch(
    '/:planId/archive',
    validateRequest({
        params: platformPlanIdParamsSchema,
    }),
    archivePlan,
);


export {
    platformPlansRouter,
};