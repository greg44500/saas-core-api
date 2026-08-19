import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';


/**
 * Clés stables des fonctionnalités génériques fournies par le socle.
 *
 * L'objet nommé évite de répéter des chaînes libres dans les routes, les
 * middlewares et les seeds. Une faute de frappe ne doit pas pouvoir modifier
 * silencieusement la fonctionnalité contrôlée.
 */
const CORE_PLAN_FEATURE = Object.freeze({
    FILE_UPLOAD: 'file_upload',
    TEAM_MANAGEMENT: 'team_management',
    AUDIT_LOGS: 'audit_logs',
});


/**
 * Liste dérivée des fonctionnalités du socle.
 *
 * Le registre et les consommateurs nommés partagent ainsi une seule source
 * de vérité.
 */
const CORE_PLAN_FEATURES = Object.freeze(
    Object.values(CORE_PLAN_FEATURE),
);

/**
 * Clés nommées des métriques génériques fournies par le socle.
 *
 * Les services consommateurs utilisent ces constantes plutôt que des chaînes
 * écrites manuellement. Une faute de frappe ne peut ainsi pas créer une
 * divergence silencieuse entre les plans, les quotas et UsageMetric.
 */
const CORE_PLAN_METRIC = Object.freeze({
    MEMBERS: 'members',
    STORAGE_BYTES: 'storage_bytes',
    FILE_UPLOADS_MONTHLY: 'file_uploads_monthly',
});

/**
 * Définitions des métriques génériques fournies par le socle SaaS.
 *
 * Chaque métrique déclare explicitement la période sur laquelle sa
 * consommation doit être mesurée.
 *
 * Le nom d'une métrique ne doit jamais servir à déduire implicitement son
 * comportement. Par exemple, le service ne devra pas rechercher le suffixe
 * "_monthly" pour décider qu'une métrique est mensuelle.
 */
const CORE_PLAN_METRIC_DEFINITIONS = Object.freeze({
    [CORE_PLAN_METRIC.MEMBERS]: Object.freeze({
        periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
    }),

    [CORE_PLAN_METRIC.STORAGE_BYTES]: Object.freeze({
        periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
    }),

    [CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY]: Object.freeze({
        periodType:
            USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
    }),
});


/**
 * Liste des clés de métriques génériques.
 *
 * Elle est générée depuis CORE_PLAN_METRIC_DEFINITIONS afin que les clés et
 * leurs métadonnées ne soient pas maintenues dans deux structures distinctes.
 */
const CORE_PLAN_METRICS = Object.freeze(
    Object.keys(CORE_PLAN_METRIC_DEFINITIONS),
);


/**
 * Construit le registre actif des capabilities disponibles pour une
 * application utilisant le socle.
 *
 * Le socle fournit ses propres features et métriques. Une application métier
 * peut ajouter :
 * - des features ;
 * - des métriques simples destinées aux Plans ;
 * - des définitions temporelles permettant à UsageMetric de mesurer ces
 *   métriques.
 *
 * Une métrique peut rester déclarée sans définition temporelle tant qu'elle
 * n'est pas utilisée par UsageMetric. Le futur UsageMetricService refusera
 * toutefois de mesurer une métrique dépourvue de définition.
 *
 * Exemple :
 *
 * createPlanCapabilityRegistry({
 *     features: ['dpe_monitoring'],
 *     metrics: ['properties'],
 *     metricDefinitions: {
 *         dpe_checks_monthly: {
 *             periodType:
 *                 USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
 *         },
 *     },
 * });
 *
 * @param {object} [extensions]
 * @param {string[]} [extensions.features]
 * @param {string[]} [extensions.metrics]
 * @param {Record<string, {
 *     periodType: string
 * }>} [extensions.metricDefinitions]
 * @returns {{
 *     features: Set<string>,
 *     metrics: Set<string>,
 *     getMetricDefinition: (
 *         metricKey: string
 *     ) => Readonly<{ periodType: string }> | null
 * }}
 */
const createPlanCapabilityRegistry = ({
    features = [],
    metrics = [],
    metricDefinitions = {},
} = {}) => {
    /*
     * Les définitions internes sont copiées et gelées afin qu'une application
     * métier ne puisse pas modifier accidentellement les définitions du socle.
     */
    const extensionMetricDefinitions = Object.entries(
        metricDefinitions,
    ).map(([metricKey, definition]) => [
        metricKey,
        Object.freeze({
            ...definition,
        }),
    ]);

    const metricDefinitionRegistry = new Map([
        ...Object.entries(CORE_PLAN_METRIC_DEFINITIONS),
        ...extensionMetricDefinitions,
    ]);

    /*
     * Les clés présentes dans metricDefinitions sont automatiquement ajoutées
     * au registre des métriques. L'application n'a donc pas besoin de les
     * déclarer une seconde fois dans metrics.
     */
    const metricRegistry = new Set([
        ...CORE_PLAN_METRICS,
        ...metrics,
        ...Object.keys(metricDefinitions),
    ]);

    const featureRegistry = new Set([
        ...CORE_PLAN_FEATURES,
        ...features,
    ]);

    return Object.freeze({
        features: featureRegistry,
        metrics: metricRegistry,

        /**
         * Retourne la définition temporelle d'une métrique.
         *
         * null distingue clairement une métrique inconnue ou une métrique
         * déclarée sans définition mesurable.
         */
        getMetricDefinition(metricKey) {
            return metricDefinitionRegistry.get(metricKey) ?? null;
        },
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
    CORE_PLAN_FEATURE,
    CORE_PLAN_FEATURES,
    CORE_PLAN_METRIC_DEFINITIONS,
    CORE_PLAN_METRICS,
    CORE_PLAN_METRIC,
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
    createPlanCapabilityRegistry,
};