import {
    getWorkspaceEffectiveEntitlement,
} from '../modules/subscriptions/subscription.service.js';

import {
    assertEntitlementFeatureAvailable,
} from '../modules/plan/planFeature.service.js';

import {
    AppError,
} from '../utils/appError.js';


const PLAN_FEATURE_KEY_PATTERN =
    /^[a-z][a-z0-9_]*$/;


/**
 * Construit la factory de contrôle des fonctionnalités commerciales effectives.
 *
 * La résolution de l'entitlement est injectée afin que le middleware reste
 * testable sans interroger MongoDB. La logique commerciale elle-même demeure
 * dans les services de domaine et ne dépend pas de req/res.
 */
const createEnforcePlanFeature = ({
    resolveWorkspaceEffectiveEntitlement,
}) => {
    if (
        typeof resolveWorkspaceEffectiveEntitlement
        !== 'function'
    ) {
        throw new TypeError(
            'Le résolveur des droits effectifs est invalide.',
        );
    }


    /**
     * Crée un middleware pour une capability commerciale stable.
     *
     * Le contrôle porte sur le Workspace, pas sur l'utilisateur. La permission
     * individuelle doit déjà avoir été vérifiée par `authorizePermission`.
     * Un override peut activer ou retirer la feature indépendamment du Plan.
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
                /*
                 * enforceWorkspaceAccessMode peut avoir résolu juste avant le
                 * même entitlement effectif. Ce contexte est produit par le
                 * serveur et peut être réutilisé pour éviter des lectures
                 * MongoDB redondantes dans une seule chaîne middleware.
                 *
                 * Une route qui n'applique pas ce middleware conserve un
                 * fallback autonome. Dans tous les cas, une écriture sensible
                 * doit relire l'autorité dans sa transaction et ne jamais
                 * considérer ce cache de requête comme un verrou métier.
                 */
                const effectiveEntitlement =
                    req.workspaceAccess?.effectiveCapabilities
                        ? req.workspaceAccess
                        : await resolveWorkspaceEffectiveEntitlement({
                            workspaceId:
                                req.workspace._id,
                        });

                assertEntitlementFeatureAvailable({
                    entitlement: effectiveEntitlement,
                    featureKey: requiredFeature,
                });

                req.effectiveEntitlement =
                    effectiveEntitlement;

                return next();
            } catch (error) {
                return next(error);
            }
        };
    };
};


/**
 * Factory applicative utilisant le véritable moteur d'entitlement.
 */
const enforcePlanFeature =
    createEnforcePlanFeature({
        resolveWorkspaceEffectiveEntitlement:
            getWorkspaceEffectiveEntitlement,
    });


export {
    createEnforcePlanFeature,
    enforcePlanFeature,
};