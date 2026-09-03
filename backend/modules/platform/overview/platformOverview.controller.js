import {
    getPlatformOverviewDashboard,
} from './platformOverviewDashboard.service.js';

/**
 * Expose la projection analytique déjà calculée par le service de cockpit.
 *
 * Le controller ne reconstruit aucune métrique ni aucun signal : il transmet
 * uniquement la période validée et sérialise le contrat HTTP Platform.
 */
const getOverview = async (req, res) => {
    const overview = await getPlatformOverviewDashboard({
        ...req.validated.query,
    });

    res.status(200).json({
        status: 'success',
        data: { overview },
    });
};

export { getOverview };
