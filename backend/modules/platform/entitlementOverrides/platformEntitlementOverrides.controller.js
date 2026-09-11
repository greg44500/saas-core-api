import {
    createPlatformEntitlementOverride,
    getPlatformEntitlementOverrideById,
    listPlatformEntitlementOverrides,
    revokePlatformEntitlementOverride,
    updatePlatformEntitlementOverride,
} from './platformEntitlementOverrides.service.js';
import {
    createPlatformFeatureOverrideGroup,
    getPlatformFeatureOverrideGroup,
    updatePlatformFeatureOverrideGroup,
} from './platformEntitlementOverrideGroups.service.js';
import {
    assertCreateFeatureOverrideGroupOperational,
    assertLimitValueWithinPolicy,
    assertUpdateFeatureOverrideGroupOperational,
    assertUpdateLimitOverrideWithinPolicy,
} from './platformEntitlementOverrideGuardrails.service.js';
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

const getFeatureOverrideGroup = async (req, res) => {
    const group = await getPlatformFeatureOverrideGroup({
        overrideId: req.validated.params.overrideId,
    });

    res.status(200).json({
        status: 'success',
        data: { group },
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
    if (req.validated.body.metricKey) {
        assertLimitValueWithinPolicy({
            metricKey: req.validated.body.metricKey,
            limitValue: req.validated.body.limitValue,
        });
    }

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

const createFeatureOverrideGroup = async (req, res) => {
    await assertCreateFeatureOverrideGroupOperational({
        groupData: req.validated.body,
    });

    const group = await createPlatformFeatureOverrideGroup({
        groupData: req.validated.body,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(201).json({
        status: 'success',
        data: { group },
    });
};

const updateEntitlementOverride = async (req, res) => {
    await assertUpdateLimitOverrideWithinPolicy({
        overrideId: req.validated.params.overrideId,
        overrideData: req.validated.body,
    });

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

const updateFeatureOverrideGroup = async (req, res) => {
    await assertUpdateFeatureOverrideGroupOperational({
        overrideId: req.validated.params.overrideId,
        groupData: req.validated.body,
    });

    const group = await updatePlatformFeatureOverrideGroup({
        overrideId: req.validated.params.overrideId,
        groupData: req.validated.body,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: { group },
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
    createFeatureOverrideGroup,
    getEntitlementContext,
    getEntitlementOverrideById,
    getFeatureOverrideGroup,
    listEntitlementOverrides,
    revokeEntitlementOverride,
    updateEntitlementOverride,
    updateFeatureOverrideGroup,
};
