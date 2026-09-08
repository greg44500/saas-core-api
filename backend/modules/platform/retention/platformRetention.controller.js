import {
    executePlatformRetentionPolicyManually,
    previewPlatformRetentionPolicy,
} from './services/platformRetentionExecution.service.js';
import {
    createPlatformRetentionPolicyVersion,
} from './services/platformRetentionPolicy.service.js';
import {
    getPlatformRetentionState,
    listPlatformRetentionExecutions,
    listPlatformRetentionTargets,
} from './services/platformRetentionRead.service.js';


const listRetentionTargets = async (_req, res) => {
    const targets = await listPlatformRetentionTargets();

    res.status(200).json({
        status: 'success',
        data: { targets },
    });
};

const getRetentionState = async (req, res) => {
    const state = await getPlatformRetentionState({
        targetKey: req.validated.params.targetKey,
    });

    res.status(200).json({
        status: 'success',
        data: { state },
    });
};

const listRetentionExecutions = async (req, res) => {
    const { executions, pagination } =
        await listPlatformRetentionExecutions({
            targetKey: req.validated.params.targetKey,
            page: req.validated.query.page,
            limit: req.validated.query.limit,
        });

    res.status(200).json({
        status: 'success',
        data: { executions },
        meta: pagination,
    });
};

const previewRetention = async (req, res) => {
    const preview = await previewPlatformRetentionPolicy({
        targetKey: req.validated.params.targetKey,
    });

    res.status(200).json({
        status: 'success',
        data: { preview },
    });
};

const createRetentionPolicyVersion = async (req, res) => {
    const {
        expectedVersion,
        ...settings
    } = req.validated.body;

    const policy = await createPlatformRetentionPolicyVersion({
        targetKey: req.validated.params.targetKey,
        expectedVersion,
        settings,
        actorId: req.user._id,
    });

    res.status(201).json({
        status: 'success',
        data: { policy },
    });
};

const executeRetentionManually = async (req, res) => {
    const result = await executePlatformRetentionPolicyManually({
        targetKey: req.validated.params.targetKey,
        ...req.validated.body,
        actorId: req.user._id,
    });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};


export {
    createRetentionPolicyVersion,
    executeRetentionManually,
    getRetentionState,
    listRetentionExecutions,
    listRetentionTargets,
    previewRetention,
};
