/**
 * Modes d'accès effectifs d'un workspace.
 *
 * Ces valeurs ne décrivent ni le statut administratif du Workspace, ni le
 * statut commercial de la Subscription. Elles représentent uniquement la
 * manière dont les droits du plan peuvent actuellement être utilisés.
 */
const WORKSPACE_ACCESS_MODE = Object.freeze({
    NORMAL: 'normal',
    REMEDIATION: 'remediation',
});

/**
 * Raisons stables pouvant expliquer un mode d'accès restreint.
 */
const WORKSPACE_ACCESS_REASON = Object.freeze({
    PLAN_LIMITS_EXCEEDED: 'plan_limits_exceeded',
});

export {
    WORKSPACE_ACCESS_MODE,
    WORKSPACE_ACCESS_REASON,
};
