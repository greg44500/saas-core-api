import {
    getPlatformOverview,
} from './platformOverview.service.js';
import {
    getPlatformOverviewAttention,
} from './platformOverviewAttention.service.js';

/**
 * Compose le cockpit dans une seule frontière de service.
 *
 * Les métriques agrégées et les lignes détaillées sont indépendantes mais
 * doivent partager exactement le même instant `at`. Cette orchestration évite
 * qu'une échéance franchie entre deux appels soit comptée dans la synthèse sans
 * apparaître dans le tableau, ou inversement.
 */
const createPlatformOverviewDashboardService = ({
    getOverview = getPlatformOverview,
    getAttention = getPlatformOverviewAttention,
} = {}) => async ({
    from,
    to,
    at = new Date(),
} = {}) => {
    const [overview, attentionItems] = await Promise.all([
        getOverview({ from, to, at }),
        getAttention({ from, to, at }),
    ]);

    return {
        ...overview,
        attention: {
            ...overview.attention,
            items: attentionItems,
        },
    };
};

const getPlatformOverviewDashboard = createPlatformOverviewDashboardService();

export {
    createPlatformOverviewDashboardService,
    getPlatformOverviewDashboard,
};
