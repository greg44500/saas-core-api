import {
    createPlatformEntitlementOverride,
    getPlatformEntitlementOverrideById,
    listPlatformEntitlementOverrides,
    revokePlatformEntitlementOverride,
    updatePlatformEntitlementOverride,
} from './platformEntitlementOverrides.service.js';
import {
    getPlatformEntitlementContext,
} from './platformEntitlementContext.service.js';


const listEntitlementOverrides = async (req, res) => {
    const { overrides, pagination } =
        await listPlatformEntitlementOverrides({
            ...req.validated.query,
        });

    res.status(200).json({
        status: 'success',
        data: { overrides },
        meta: pagination,
    });
};

const getEntitlementOverrideById = async (req, res) => {
    const override = await getPlatformEntitlementOverrideById({
        overrideId: req.validated.params.overrideId,
    });

    res.status(200).json({
        status: 'success',
        data: { override },
    });
};

const getEntitlementContext = async (req, res) => {
    const context = await getPlatformEntitlementContext({
        workspaceId: req.validated.params.workspaceId,
    });

    res.status(200).json({
        status: 'success',
        data: { context },
    });
};

const createEntitlementOverride = async (req, res) => {
    const override = await createPlatformEntitlementOverride({
        overrideData: req.validated.body,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(201).json({
        status: 'success',
        data: { override },
    });
};

const updateEntitlementOverride = async (req, res) => {
    const override = await updatePlatformEntitlementOverride({
        overrideId: req.validated.params.overrideId,
        overrideData: req.validated.body,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: { override },
    });
};

const revokeEntitlementOverride = async (req, res) => {
    const override = await revokePlatformEntitlementOverride({
        overrideId: req.validated.params.overrideId,
        reason: req.validated.body.reason,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: { override },
    });
};


export {
    createEntitlementOverride,
    getEntitlementContext,
    getEntitlementOverrideById,
    listEntitlementOverrides,
    revokeEntitlementOverride,
    updateEntitlementOverride,
};
