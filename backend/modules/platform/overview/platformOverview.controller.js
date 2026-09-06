import {
    getPlatformOverviewDashboard,
} from './platformOverviewDashboard.service.js';

/**
 * Expose la projection analytique déjà calculée par le service de cockpit.
 *
 * Le controller ne reconstruit aucune métrique ni aucun signal : il transmet
 * uniquement la période validée et les permissions runtime résolues par le
 * middleware Platform afin que le service filtre la réponse côté backend.
 */
const getOverview = async (req, res) => {
    const overview = await getPlatformOverviewDashboard({
        ...req.validated.query,
        permissions: req.platformAuthorization?.permissions ?? [],
    });

    res.status(200).json({
        status: 'success',
        data: { overview },
    });
};

export { getOverview };
