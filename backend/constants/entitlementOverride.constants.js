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

export {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
};
