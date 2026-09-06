import {
    getPlatformOverview,
} from './platformOverview.service.js';
import {
    getPlatformOverviewAttention,
} from './platformOverviewAttention.service.js';
import {
    projectPlatformOverviewByPermissions,
} from './platformOverviewProjection.service.js';

/**
 * Compose le cockpit dans une seule frontière de service.
 *
 * Les métriques agrégées et les lignes détaillées sont indépendantes mais
 * doivent partager exactement le même instant `at`. Cette orchestration évite
 * qu'une échéance franchie entre deux appels soit comptée dans la synthèse sans
 * apparaître dans le tableau, ou inversement.
 *
 * La projection finale est filtrée côté backend selon les permissions runtime
 * de l'acteur. Le frontend ne reçoit jamais les domaines non autorisés.
 */
const createPlatformOverviewDashboardService = ({
    getOverview = getPlatformOverview,
    getAttention = getPlatformOverviewAttention,
    projectOverview = projectPlatformOverviewByPermissions,
} = {}) => async ({
    from,
    to,
    at = new Date(),
    permissions = [],
} = {}) => {
    const [overview, attentionItems] = await Promise.all([
        getOverview({ from, to, at }),
        getAttention({ from, to, at }),
    ]);

    const completeOverview = {
        ...overview,
        attention: {
            ...overview.attention,
            items: attentionItems,
        },
    };

    return projectOverview({
        overview: completeOverview,
        permissions,
    });
};

const getPlatformOverviewDashboard = createPlatformOverviewDashboardService();

export {
    createPlatformOverviewDashboardService,
    getPlatformOverviewDashboard,
};
