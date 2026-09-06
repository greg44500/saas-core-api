import {
    getCurrentPlatformContext,
} from './platformCurrentContext.service.js';


const getCurrent = async (req, res) => {
    const platformAccess = await getCurrentPlatformContext({
        user: req.user,
    });

    res.status(200).json({
        status: 'success',
        data: {
            platformAccess,
        },
    });
};


export { getCurrent };
