import {
    getPlatformOverview,
} from './platformOverview.service.js';

/**
 * Expose la projection analytique déjà calculée par le service.
 *
 * Le controller ne reconstruit aucune métrique : il transmet uniquement la
 * période validée et sérialise le contrat HTTP Platform.
 */
const getOverview = async (req, res) => {
    const overview = await getPlatformOverview({
        ...req.validated.query,
    });

    res.status(200).json({
        status: 'success',
        data: { overview },
    });
};

export { getOverview };
