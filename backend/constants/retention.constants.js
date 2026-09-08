const RETENTION_EXECUTION_TRIGGER = Object.freeze({
    MANUAL: 'manual',
    SCHEDULED: 'scheduled',
});

const RETENTION_EXECUTION_STATUS = Object.freeze({
    RUNNING: 'running',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
});


export {
    RETENTION_EXECUTION_STATUS,
    RETENTION_EXECUTION_TRIGGER,
};
