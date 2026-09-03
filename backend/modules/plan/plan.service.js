import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';
import { PLAN_STATUS } from '../../constants/plan.constants.js';
import { AppError } from '../../utils/appError.js';
import { Plan } from './plan.model.js';


const getLimitKeys = (limits) => {
    if (limits instanceof Map) {
        return [...limits.keys()];
    }

    if (
        limits
        && typeof limits === 'object'
        && !Array.isArray(limits)
    ) {
        return Object.keys(limits);
    }

    return [];
};


/**
 * Vérifie les capabilities d'un plan contre le registre actif.
 *
 * Lorsqu'un objet `limits` est fourni, il doit décrire toutes les métriques
 * actives. Le moteur de quotas distingue volontairement `null` (illimité),
 * `0` (aucune consommation) et une clé absente (configuration invalide).
 *
 * Le registre reste injectable pour les tests et les services spécialisés,
 * mais le comportement normal de l'application utilise son registre actif
 * composé dans `config/applicationCapability.registry.js`.
 */
const validatePlanCapabilities = (
    planData,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
) => {
    const features = planData?.features ?? [];
    const limits = planData?.limits ?? {};

    const unknownFeatures = features.filter(
        (feature) => !registry.features.has(feature),
    );

    if (unknownFeatures.length > 0) {
        throw new AppError(
            `Fonctionnalités de plan inconnues : ${unknownFeatures.join(', ')}.`,
            400,
        );
    }

    const limitKeys = getLimitKeys(limits);
    const unknownMetrics = limitKeys.filter(
        (metric) => !registry.metrics.has(metric),
    );

    if (unknownMetrics.length > 0) {
        throw new AppError(
            `Métriques de plan inconnues : ${unknownMetrics.join(', ')}.`,
            400,
        );
    }

    if (Object.hasOwn(planData ?? {}, 'limits')) {
        const configuredMetrics = new Set(limitKeys);
        const missingMetrics = [...registry.metrics].filter(
            (metric) => !configuredMetrics.has(metric),
        );

        if (missingMetrics.length > 0) {
            throw new AppError(
                `Limites de plan non configurées : ${missingMetrics.join(', ')}.`,
                400,
            );
        }
    }
};


/**
 * Crée une offre commerciale après validation de ses capabilities.
 *
 * Une création doit toujours définir toutes les limites actives : un plan
 * incomplet ne doit pas pouvoir atteindre le moteur de quotas puis échouer
 * tardivement en production.
 */
const createPlan = async ({
    planData,
    actorId = null,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session,
}) => {
    validatePlanCapabilities(
        {
            ...planData,
            limits: planData?.limits ?? {},
        },
        registry,
    );

    const plan = new Plan({
        ...planData,
        createdBy: actorId,
        updatedBy: actorId,
    });

    const saveOptions = session
        ? { session }
        : undefined;

    return plan.save(saveOptions);
};


/**
 * Retourne uniquement les plans actifs et publics destinés au catalogue
 * commercial. Les données d'administration restent dans le périmètre Platform.
 */
const listPublicPlans = async () => {
    return Plan.find({
        status: PLAN_STATUS.ACTIVE,
        isPublic: true,
    })
        .select([
            'key',
            'name',
            'description',
            'displayOrder',
            'trialEnabled',
            'trialDurationDays',
            'currency',
            'priceMonthlyExclTaxMinor',
            'priceYearlyExclTaxMinor',
            'features',
            'limits',
        ].join(' '))
        .sort({
            displayOrder: 1,
            name: 1,
        })
        .lean();
};


export {
    createPlan,
    listPublicPlans,
    validatePlanCapabilities,
};
