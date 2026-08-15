/**
 * États administratifs possibles d'un plan commercial.
 *
 * Le statut décrit si le plan peut encore être utilisé par la plateforme.
 * Il est distinct de `isPublic`, qui indiquera uniquement si le plan doit être
 * visible dans le catalogue commercial présenté aux utilisateurs.
 */
const PLAN_STATUS = Object.freeze({
    /**
     * Plan actuellement disponible.
     *
     * Un plan actif peut être utilisé pour créer ou maintenir une Subscription,
     * sous réserve des règles appliquées ultérieurement par le service.
     */
    ACTIVE: 'active',

    /**
     * Plan temporairement indisponible.
     *
     * Cet état permet de retirer temporairement une offre sans perdre sa
     * définition ni les références historiques qui peuvent déjà exister.
     */
    INACTIVE: 'inactive',

    /**
     * Ancien plan conservé pour l'historique.
     *
     * Un plan archivé ne doit normalement plus être attribué à de nouvelles
     * subscriptions. Il reste cependant en base afin de préserver les
     * références des abonnements historiques.
     */
    ARCHIVED: 'archived',
});


/**
 * Clés fonctionnelles des plans fournis par défaut par le socle.
 *
 * Ces clés sont des identifiants métier stables :
 * - elles peuvent être utilisées par les seeds et les services ;
 * - elles ne doivent pas dépendre du nom commercial affiché ;
 * - leur valeur ne doit pas changer après création du plan.
 *
 * Une application utilisant le socle pourra faire évoluer son catalogue,
 * mais ces clés représentent les offres génériques prévues initialement.
 */
const PLAN_KEY = Object.freeze({
    FREE: 'free',
    STARTER: 'starter',
    PREMIUM: 'premium',
    BUSINESS: 'business',
    ENTERPRISE: 'enterprise',
});


export {
    PLAN_KEY,
    PLAN_STATUS,
};