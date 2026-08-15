/**
 * Fonctionnalités génériques fournies directement par le socle SaaS.
 *
 * Une feature représente une capacité disponible ou non dans un plan.
 * Elle ne contient aucune notion de quantité : les plafonds appartiennent
 * au registre des métriques.
 *
 * Les applications métier pourront fournir leurs propres features sans
 * modifier le modèle Plan.
 */
const CORE_PLAN_FEATURES = Object.freeze([
    'file_upload',
    'team_management',
    'audit_logs',
]);


/**
 * Métriques génériques pouvant être plafonnées par un plan.
 *
 * Une métrique représente une quantité mesurable.
 *
 * Exemples :
 * - members : nombre de membres autorisés ;
 * - storage_bytes : volume de stockage autorisé ;
 * - file_uploads_monthly : nombre d'uploads autorisés sur une période mensuelle.
 *
 * Leur consommation réelle sera gérée ultérieurement par UsageMetric.
 */
const CORE_PLAN_METRICS = Object.freeze([
    'members',
    'storage_bytes',
    'file_uploads_monthly',
]);


/**
 * Construit le registre actif des capabilities disponibles pour une
 * application utilisant le socle.
 *
 * Le socle fournit ses propres features et métriques, tandis qu'un module
 * métier peut en ajouter sans modifier SAAS-CORE-API.
 *
 * Exemple pour une application immobilière :
 *
 * createPlanCapabilityRegistry({
 *     features: ['dpe_monitoring'],
 *     metrics: ['properties', 'dpe_checks_monthly'],
 * });
 *
 * @param {object} [extensions]
 * @param {string[]} [extensions.features]
 * @param {string[]} [extensions.metrics]
 * @returns {{
 *     features: ReadonlySet<string>,
 *     metrics: ReadonlySet<string>
 * }}
 */
const createPlanCapabilityRegistry = ({
    features = [],
    metrics = [],
} = {}) => {
    const featureRegistry = new Set([
        ...CORE_PLAN_FEATURES,
        ...features,
    ]);

    const metricRegistry = new Set([
        ...CORE_PLAN_METRICS,
        ...metrics,
    ]);

    return Object.freeze({
        features: featureRegistry,
        metrics: metricRegistry,
    });
};


/**
 * Registre utilisé par défaut lorsque seul le socle SaaS est chargé.
 *
 * Les futures applications métier pourront construire un registre enrichi
 * puis l'injecter dans les services qui en ont besoin.
 */
const DEFAULT_PLAN_CAPABILITY_REGISTRY =
    createPlanCapabilityRegistry();


export {
    CORE_PLAN_FEATURES,
    CORE_PLAN_METRICS,
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
    createPlanCapabilityRegistry,
};