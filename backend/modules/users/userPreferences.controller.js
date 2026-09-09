import {
    getCurrentUserPreferences,
    updateCurrentUserPreferences,
} from './userPreferences.service.js';

async function getMyPreferences(req, res) {
    const preferences = await getCurrentUserPreferences({
        userId: req.user.id,
    });

    res.status(200).json({
        status: 'success',
        data: { preferences },
    });
}

async function updateMyPreferences(req, res) {
    const preferences = await updateCurrentUserPreferences({
        userId: req.user.id,
        comfort: req.validated.body.comfort,
    });

    res.status(200).json({
        status: 'success',
        data: { preferences },
    });
}

export {
    getMyPreferences,
    updateMyPreferences,
};
