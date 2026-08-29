import {
    USAGE_METRIC_BEHAVIOR,
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
 * Chaque métrique déclare explicitement :
 * - sa période de mesure ;
 * - sa nature métier ;
 * - si un dépassement doit imposer une mise en conformité du workspace.
 *
 * Le nom d'une métrique ne doit jamais servir à déduire implicitement son
 * comportement. Une future application métier peut donc ajouter ses propres
 * métriques sans dépendre d'une convention de nommage fragile.
 */
const CORE_PLAN_METRIC_DEFINITIONS = Object.freeze({
    [CORE_PLAN_METRIC.MEMBERS]: Object.freeze({
        periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        behavior: USAGE_METRIC_BEHAVIOR.CAPACITY,
        remediationRequired: true,
    }),

    [CORE_PLAN_METRIC.STORAGE_BYTES]: Object.freeze({
        periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        behavior: USAGE_METRIC_BEHAVIOR.CAPACITY,
        remediationRequired: true,
    }),

    [CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY]: Object.freeze({
        periodType: USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
        behavior: USAGE_METRIC_BEHAVIOR.CONSUMPTION,
        remediationRequired: false,
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
 * - des définitions temporelles et métier permettant de mesurer puis
 *   interpréter correctement ces métriques.
 *
 * Une métrique peut rester déclarée sans définition tant qu'elle n'est pas
 * utilisée par UsageMetric ou par une politique de compatibilité de plan.
 * Les services qui ont besoin de sa sémantique refuseront alors de l'utiliser.
 *
 * @param {object} [extensions]
 * @param {string[]} [extensions.features]
 * @param {string[]} [extensions.metrics]
 * @param {Record<string, {
 *     periodType: string,
 *     behavior?: string,
 *     remediationRequired?: boolean
 * }>} [extensions.metricDefinitions]
 * @returns {{
 *     features: Set<string>,
 *     metrics: Set<string>,
 *     getMetricDefinition: (
 *         metricKey: string
 *     ) => Readonly<{
 *         periodType: string,
 *         behavior?: string,
 *         remediationRequired?: boolean
 *     }> | null
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
         * Retourne la définition d'une métrique.
         *
         * null distingue clairement une métrique inconnue ou une métrique
         * déclarée sans définition exploitable par les services métier.
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