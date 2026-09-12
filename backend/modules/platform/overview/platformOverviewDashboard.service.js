import {
    getPlatformOverview,
} from './platformOverview.service.js';
import {
    getPlatformOverviewAttention,
} from './platformOverviewAttention.service.js';
import {
    getPlatformOverviewEconomicKpis,
} from './platformOverviewEconomicKpis.service.js';
import {
    projectPlatformOverviewByPermissions,
} from './platformOverviewProjection.service.js';
import {
    getPlatformOverviewUserPopulation,
} from './platformOverviewUserPopulation.service.js';

/**
 * Compose le cockpit dans une seule frontière de service.
 *
 * Les métriques agrégées, les KPI économiques et les lignes détaillées sont
 * indépendants mais doivent partager exactement le même instant `at`. Cette
 * orchestration évite qu'une échéance franchie entre deux appels soit comptée
 * dans la synthèse sans apparaître dans le tableau, ou inversement.
 *
 * La projection finale est filtrée côté backend selon les permissions runtime
 * de l'acteur. Le frontend ne reçoit jamais les domaines non autorisés.
 */
const createPlatformOverviewDashboardService = ({
    getOverview = getPlatformOverview,
    getAttention = getPlatformOverviewAttention,
    getEconomicKpis = getPlatformOverviewEconomicKpis,
    getUserPopulation = getPlatformOverviewUserPopulation,
    projectOverview = projectPlatformOverviewByPermissions,
} = {}) => async ({
    from,
    to,
    at = new Date(),
    permissions = [],
} = {}) => {
    const [
        overview,
        attentionItems,
        economicKpis,
        userPopulation,
    ] = await Promise.all([
        getOverview({ from, to, at }),
        getAttention({ from, to, at }),
        getEconomicKpis({ at }),
        getUserPopulation(),
    ]);

    const totalUsers = overview.kpis?.users?.total ?? 0;
    const withCurrentClientAccess = Math.min(
        userPopulation?.withCurrentClientAccess ?? 0,
        totalUsers,
    );

    const completeOverview = {
        ...overview,
        kpis: {
            ...overview.kpis,
            ...economicKpis,
        },
        users: {
            ...overview.users,
            population: {
                total: totalUsers,
                withCurrentClientAccess,
                withoutCurrentClientAccess:
                    Math.max(totalUsers - withCurrentClientAccess, 0),
            },
        },
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
