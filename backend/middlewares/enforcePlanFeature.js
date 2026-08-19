import {
    getWorkspacePlanEntitlement,
} from '../modules/subscriptions/subscription.service.js';

import {
    assertPlanFeatureAvailable,
} from '../modules/plan/planFeature.service.js';

import {
    AppError,
} from '../utils/appError.js';


const PLAN_FEATURE_KEY_PATTERN =
    /^[a-z][a-z0-9_]*$/;


/**
 * Construit la factory de contrôle des fonctionnalités du plan.
 *
 * La résolution de la souscription est injectée afin que le middleware soit
 * testable sans interroger MongoDB.
 *
 * Cette couche dépend de req et next : elle appartient donc aux middlewares.
 * La logique de résolution du plan reste dans SubscriptionService.
 */
const createEnforcePlanFeature = ({
    resolveWorkspacePlanEntitlement,
}) => {
    if (
        typeof resolveWorkspacePlanEntitlement
        !== 'function'
    ) {
        throw new TypeError(
            'Le résolveur des droits du plan est invalide.',
        );
    }


    /**
     * Crée un middleware pour une fonctionnalité stable du plan.
     *
     * Le contrôle porte sur le workspace et non sur l'utilisateur. La
     * permission individuelle a déjà été vérifiée par authorizePermission.
     */
    return (requiredFeature) => {
        if (
            typeof requiredFeature !== 'string'
            || !PLAN_FEATURE_KEY_PATTERN
                .test(requiredFeature)
        ) {
            throw new TypeError(
                'La clé de fonctionnalité du plan est invalide.',
            );
        }


        return async (req, res, next) => {
            /*
             * Ce middleware doit toujours être exécuté après
             * loadWorkspaceContext. On refuse l'accès si cette précondition
             * architecturale n'est pas respectée.
             */
            if (!req.workspace?._id) {
                return next(
                    new AppError(
                        'Le contexte du workspace est indisponible.',
                        500,
                    ),
                );
            }

            try {
                const planEntitlement =
                    await resolveWorkspacePlanEntitlement({
                        workspaceId:
                            req.workspace._id,
                    });

                /*
                * La règle fonctionnelle reste dans PlanService afin de pouvoir
                * être réutilisée hors HTTP, notamment dans la transaction
                * atomique qui créera File et réservera ses quotas.
                */
                assertPlanFeatureAvailable({
                    plan: planEntitlement?.plan,
                    featureKey: requiredFeature,
                });

                /*
                 * Ce résultat est conservé comme contexte utile à la requête.
                 * Il ne constitue pas une autorité transactionnelle : le plan
                 * sera relu et revérifié dans la session MongoDB au moment de
                 * réserver les quotas et de créer File.
                 */
                req.planEntitlement =
                    planEntitlement;

                return next();
            } catch (error) {
                /*
                 * Les erreurs du service Subscription conservent leur nature :
                 * absence de souscription utilisable, plan introuvable ou
                 * erreur technique MongoDB.
                 */
                return next(error);
            }
        };
    };
};


/**
 * Factory applicative utilisant le véritable service Subscription.
 */
const enforcePlanFeature =
    createEnforcePlanFeature({
        resolveWorkspacePlanEntitlement:
            getWorkspacePlanEntitlement,
    });


export {
    createEnforcePlanFeature,
    enforcePlanFeature,
};