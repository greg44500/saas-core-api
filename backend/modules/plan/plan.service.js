import { Plan } from './plan.model.js';
import {
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
} from './planCapability.registry.js';
import { PLAN_STATUS } from '../../constants/plan.constants.js';
import { AppError } from '../../utils/appError.js';


/**
 * Extrait les clés de limites quelle que soit la représentation reçue.
 *
 * Une Map est utilisée par le document Mongoose, tandis qu'un objet simple
 * peut provenir d'une requête HTTP ou d'un seed avant l'instanciation du Plan.
 *
 * @param {Map<string, number> | object | undefined} limits
 * @returns {string[]}
 */
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
 * Vérifie que les fonctionnalités et métriques d'un plan sont déclarées
 * dans le registre actif de l'application.
 *
 * Le modèle Plan contrôle la structure des clés. Le service contrôle ici
 * leur existence fonctionnelle afin qu'une faute de frappe ou une capability
 * non installée ne puisse pas être enregistrée silencieusement.
 *
 * Le registre est injectable pour permettre à une future application métier
 * d'ajouter ses propres capabilities sans modifier le socle SaaS.
 *
 * @param {object} planData
 * @param {string[]} [planData.features]
 * @param {Map<string, number> | object} [planData.limits]
 * @param {{
 *     features: Set<string>,
 *     metrics: Set<string>
 * }} [registry]
 * @returns {void}
 */
const validatePlanCapabilities = (
    {
        features = [],
        limits = {},
    },
    registry = DEFAULT_PLAN_CAPABILITY_REGISTRY,
) => {
    const unknownFeatures = features.filter(
        (feature) => !registry.features.has(feature),
    );

    if (unknownFeatures.length > 0) {
        throw new AppError(
            `Fonctionnalités de plan inconnues : ${unknownFeatures.join(', ')}.`,
            400,
        );
    }

    const unknownMetrics = getLimitKeys(limits).filter(
        (metric) => !registry.metrics.has(metric),
    );

    if (unknownMetrics.length > 0) {
        throw new AppError(
            `Métriques de plan inconnues : ${unknownMetrics.join(', ')}.`,
            400,
        );
    }
};

/**
 * Crée une nouvelle offre commerciale après validation de ses capabilities.
 *
 * `actorId` peut être null lorsqu'un plan est créé par un processus système,
 * notamment par le futur seed des plans initiaux.
 *
 * Une session MongoDB peut être injectée lorsqu'une création doit participer
 * à une transaction plus large. Elle reste facultative pour une création
 * administrative simple.
 *
 * @param {object} params
 * @param {object} params.planData
 * @param {import('mongoose').Types.ObjectId | null} [params.actorId]
 * @param {{
 *     features: Set<string>,
 *     metrics: Set<string>
 * }} [params.registry]
 * @param {import('mongoose').ClientSession} [params.session]
 * @returns {Promise<import('mongoose').Document>}
 */
const createPlan = async ({
    planData,
    actorId = null,
    registry = DEFAULT_PLAN_CAPABILITY_REGISTRY,
    session,
}) => {
    validatePlanCapabilities(planData, registry);

    const plan = new Plan({
        ...planData,
        createdBy: actorId,
        updatedBy: actorId,
    });

    // La session est transmise uniquement lorsqu'elle existe afin de conserver
    // une création simple hors transaction pour l'administration courante.
    const saveOptions = session
        ? { session }
        : undefined;

    return plan.save(saveOptions);
};

/**
 * Retourne le catalogue des plans visibles publiquement.
 *
 * Seuls les plans actifs et explicitement publics sont exposés. Un plan
 * inactif, archivé ou réservé à l'administration ne doit jamais apparaître
 * simplement parce qu'il existe encore dans la base.
 *
 * La projection limite volontairement les données retournées aux informations
 * nécessaires à la présentation commerciale. Les champs de traçabilité et
 * d'administration restent internes à la plateforme.
 *
 * @returns {Promise<object[]>}
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