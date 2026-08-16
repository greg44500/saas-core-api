/**
 * Types de périodes utilisées pour mesurer la consommation d'un workspace.
 *
 * Cette constante décrit uniquement la fenêtre temporelle d'une mesure.
 * Les clés des métriques disponibles restent déclarées dans
 * planCapability.registry.js afin d'éviter deux sources de vérité.
 */
const USAGE_METRIC_PERIOD_TYPE = Object.freeze({
    /**
     * Mesure représentant un état courant, sans remise à zéro périodique.
     *
     * Exemples :
     * - nombre actuel de membres ;
     * - volume de stockage actuellement utilisé.
     */
    CURRENT: 'current',

    /**
     * Mesure calculée sur un mois civil en UTC.
     *
     * Chaque mois possède son propre document UsageMetric afin de conserver
     * l'historique sans remettre physiquement l'ancien compteur à zéro.
     *
     * Exemple :
     * - nombre de fichiers envoyés entre le 1er août inclus
     *   et le 1er septembre exclu.
     */
    CALENDAR_MONTH: 'calendar_month',
});


export { USAGE_METRIC_PERIOD_TYPE };