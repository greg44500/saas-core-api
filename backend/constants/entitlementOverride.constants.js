const ENTITLEMENT_OVERRIDE_TARGET = Object.freeze({
    FEATURE: 'feature',
    LIMIT: 'limit',
});

const ENTITLEMENT_OVERRIDE_SOURCE = Object.freeze({
    PROMOTION: 'promotion',
    COMMERCIAL_GESTURE: 'commercial_gesture',
    SUPPORT: 'support',
    CONTRACT: 'contract',
    INCIDENT: 'incident',
    ADMINISTRATIVE: 'administrative',
});

/**
 * État temporel dérivé d'une dérogation.
 *
 * Cette valeur n'est jamais persistée : elle sert au contrat de lecture et aux
 * filtres Platform tout en restant calculée depuis startsAt, endsAt et revokedAt.
 */
const ENTITLEMENT_OVERRIDE_LIFECYCLE = Object.freeze({
    ACTIVE: 'active',
    SCHEDULED: 'scheduled',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
});

export {
    ENTITLEMENT_OVERRIDE_LIFECYCLE,
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
};
