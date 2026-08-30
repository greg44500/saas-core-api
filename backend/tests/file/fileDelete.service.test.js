import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    FILE_RETENTION_DAYS,
    FILE_STATUS,
} from '../../constants/file.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    deleteWorkspaceFile,
} from '../../modules/file/fileDelete.service.js';
import { File } from '../../modules/file/file.model.js';
import {
    CORE_PLAN_METRIC,
} from '../../modules/plan/planCapability.registry.js';
import {
    releaseCurrentUsageMetric,
} from '../../modules/usageMetric/releaseUsageMetric.service.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';

const {
    transaction,
} = vi.hoisted(() => ({
    transaction: vi.fn(async (callback) => callback('session')),
}));

vi.mock('mongoose', async (importOriginal) => {
    const actual = await importOriginal();

    return {
        ...actual,
        default: {
            ...actual.default,
            connection: {
                transaction,
            },
        },
    };
});

vi.mock('../../modules/file/file.model.js', () => ({
    File: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/usageMetric/releaseUsageMetric.service.js', () => ({
    releaseCurrentUsageMetric: vi.fn(),
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(
        async (callback) => callback('session'),
    );
});

describe('deleteWorkspaceFile', () => {
    it('supprime logiquement le fichier et libère le stockage dans la même transaction', async () => {
        const now = new Date('2026-08-30T10:00:00.000Z');
        const expectedPurge = new Date(now);
        expectedPurge.setUTCDate(
            expectedPurge.getUTCDate() + FILE_RETENTION_DAYS,
        );

        const file = {
            _id: '507f1f77bcf86cd799439012',
            sizeBytes: 2_048,
            status: FILE_STATUS.ACTIVE,
            deletedAt: null,
            deletedBy: null,
            purgeScheduledAt: null,
            purgedAt: null,
            updatedBy: null,
            save: vi.fn().mockResolvedValue(undefined),
        };

        const session = vi.fn().mockResolvedValue(file);
        File.findOne.mockReturnValue({ session });

        const result = await deleteWorkspaceFile({
            workspaceId: '507f1f77bcf86cd799439011',
            fileId: file._id,
            actorId: '507f1f77bcf86cd799439013',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
            now,
        });

        expect(File.findOne).toHaveBeenCalledWith({
            _id: file._id,
            workspace: '507f1f77bcf86cd799439011',
            status: FILE_STATUS.ACTIVE,
        });
        expect(session).toHaveBeenCalledWith('session');

        expect(file.status).toBe(FILE_STATUS.DELETED);
        expect(file.deletedAt).toBe(now);
        expect(file.deletedBy).toBe('507f1f77bcf86cd799439013');
        expect(file.purgeScheduledAt).toEqual(expectedPurge);
        expect(file.purgedAt).toBeNull();
        expect(file.updatedBy).toBe('507f1f77bcf86cd799439013');
        expect(file.save).toHaveBeenCalledWith({ session: 'session' });

        expect(releaseCurrentUsageMetric).toHaveBeenCalledWith({
            workspaceId: '507f1f77bcf86cd799439011',
            metricKey: CORE_PLAN_METRIC.STORAGE_BYTES,
            amount: 2_048,
            actorId: '507f1f77bcf86cd799439013',
            session: 'session',
        });

        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: '507f1f77bcf86cd799439013',
                workspace: '507f1f77bcf86cd799439011',
                action: AUDIT_ACTION.FILE_DELETED,
                entityType: AUDIT_ENTITY_TYPE.FILE,
                entityId: file._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent',
                metadata: {
                    sizeBytes: 2_048,
                    purgeScheduledAt: expectedPurge,
                },
            },
            { session: 'session' },
        );

        expect(result).toBe(file);
    });

    it('retourne 404 si le fichier actif n’existe pas dans le workspace', async () => {
        File.findOne.mockReturnValue({
            session: vi.fn().mockResolvedValue(null),
        });

        await expect(deleteWorkspaceFile({
            workspaceId: '507f1f77bcf86cd799439011',
            fileId: '507f1f77bcf86cd799439012',
            actorId: '507f1f77bcf86cd799439013',
        })).rejects.toMatchObject({
            statusCode: 404,
            message: 'Fichier introuvable',
        });

        expect(releaseCurrentUsageMetric).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
