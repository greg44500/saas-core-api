const RETENTION_EXECUTION_TRIGGER = Object.freeze({
    MANUAL: 'manual',
    SCHEDULED: 'scheduled',
});

const RETENTION_EXECUTION_STATUS = Object.freeze({
    RUNNING: 'running',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
});

const RETENTION_EXECUTION_ERROR_CODE = Object.freeze({
    LOCK_LOST: 'RETENTION_LOCK_LOST',
    INTERRUPTED: 'RETENTION_EXECUTION_INTERRUPTED',
    TARGET_EXECUTION_FAILED: 'RETENTION_TARGET_EXECUTION_FAILED',
});

/*
 * Une lease couvre un lot de purge et est renouvelée avant/après chaque lot.
 * Elle doit rester suffisamment courte pour permettre une reprise après crash
 * sans laisser durablement une target bloquée.
 */
const RETENTION_LOCK_LEASE_MS = 5 * 60 * 1000;

export {
    RETENTION_EXECUTION_ERROR_CODE,
    RETENTION_EXECUTION_STATUS,
    RETENTION_EXECUTION_TRIGGER,
    RETENTION_LOCK_LEASE_MS,
};
