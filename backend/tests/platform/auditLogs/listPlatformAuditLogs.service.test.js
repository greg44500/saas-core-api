import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import { AuditLog } from '../../../modules/auditLog/auditLog.model.js';
import {
    listPlatformAuditLogs,
} from '../../../modules/platform/auditLogs/services/listPlatformAuditLogs.service.js';


const createFindQueryMock = (documents) => ({
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(documents),
});


describe('listPlatformAuditLogs', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('retourne un DTO global limité avec acteur, workspace et pagination', async () => {
        const auditLogId = new mongoose.Types.ObjectId();
        const actorId = new mongoose.Types.ObjectId();
        const workspaceId = new mongoose.Types.ObjectId();
        const entityId = new mongoose.Types.ObjectId();
        const createdAt = new Date('2026-08-30T10:00:00.000Z');

        const query = createFindQueryMock([
            {
                _id: auditLogId,
                actor: {
                    _id: actorId,
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    email: 'ada@example.com',
                },
                workspace: {
                    _id: workspaceId,
                    name: 'Workspace Alpha',
                },
                action: AUDIT_ACTION.WORKSPACE_UPDATED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId,
                status: AUDIT_STATUS.SUCCESS,
                createdAt,
            },
        ]);

        const findSpy = vi
            .spyOn(AuditLog, 'find')
            .mockReturnValue(query);
        vi.spyOn(AuditLog, 'countDocuments')
            .mockResolvedValue(21);

        const result = await listPlatformAuditLogs({
            page: 2,
            limit: 10,
        });

        expect(findSpy).toHaveBeenCalledWith({});
        expect(query.select).toHaveBeenCalledWith(
            '_id actor workspace action '
            + 'entityType entityId status createdAt',
        );
        expect(query.populate).toHaveBeenNthCalledWith(1, {
            path: 'actor',
            select: '_id firstName lastName email',
        });
        expect(query.populate).toHaveBeenNthCalledWith(2, {
            path: 'workspace',
            select: '_id name',
        });
        expect(query.sort).toHaveBeenCalledWith({
            createdAt: -1,
            _id: -1,
        });
        expect(query.skip).toHaveBeenCalledWith(10);
        expect(query.limit).toHaveBeenCalledWith(10);

        expect(result).toEqual({
            auditLogs: [
                {
                    id: auditLogId.toString(),
                    actor: {
                        id: actorId.toString(),
                        firstName: 'Ada',
                        lastName: 'Lovelace',
                        email: 'ada@example.com',
                    },
                    workspace: {
                        id: workspaceId.toString(),
                        name: 'Workspace Alpha',
                    },
                    action: AUDIT_ACTION.WORKSPACE_UPDATED,
                    status: AUDIT_STATUS.SUCCESS,
                    entity: {
                        type: AUDIT_ENTITY_TYPE.WORKSPACE,
                        id: entityId.toString(),
                    },
                    createdAt,
                },
            ],
            pagination: {
                page: 2,
                limit: 10,
                total: 21,
                totalPages: 3,
            },
        });
    });

    it('construit uniquement les filtres Platform explicitement supportés', async () => {
        const workspaceId = new mongoose.Types.ObjectId();
        const actorId = new mongoose.Types.ObjectId();
        const from = new Date('2026-08-01T00:00:00.000Z');
        const to = new Date('2026-08-31T23:59:59.999Z');
        const query = createFindQueryMock([]);

        const findSpy = vi
            .spyOn(AuditLog, 'find')
            .mockReturnValue(query);
        vi.spyOn(AuditLog, 'countDocuments')
            .mockResolvedValue(0);

        await listPlatformAuditLogs({
            workspaceId,
            actorId,
            action: AUDIT_ACTION.MEMBER_REMOVED,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
            status: AUDIT_STATUS.SUCCESS,
            from,
            to,
        });

        const filter = findSpy.mock.calls[0][0];

        expect(filter.workspace.toString()).toBe(workspaceId.toString());
        expect(filter.actor.toString()).toBe(actorId.toString());
        expect(filter.action).toBe(AUDIT_ACTION.MEMBER_REMOVED);
        expect(filter.entityType).toBe(
            AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
        );
        expect(filter.status).toBe(AUDIT_STATUS.SUCCESS);
        expect(filter.createdAt.$gte).toBe(from);
        expect(filter.createdAt.$lte).toBe(to);
    });

    it('gère les événements globaux sans acteur, workspace ni ressource', async () => {
        const auditLogId = new mongoose.Types.ObjectId();
        const createdAt = new Date('2026-08-30T11:00:00.000Z');
        const query = createFindQueryMock([
            {
                _id: auditLogId,
                actor: null,
                workspace: null,
                action: AUDIT_ACTION.LOGIN_FAILED,
                entityType: null,
                entityId: null,
                status: AUDIT_STATUS.FAILED,
                createdAt,
            },
        ]);

        vi.spyOn(AuditLog, 'find').mockReturnValue(query);
        vi.spyOn(AuditLog, 'countDocuments').mockResolvedValue(1);

        const result = await listPlatformAuditLogs({});

        expect(result.auditLogs[0]).toEqual({
            id: auditLogId.toString(),
            actor: null,
            workspace: null,
            action: AUDIT_ACTION.LOGIN_FAILED,
            status: AUDIT_STATUS.FAILED,
            entity: null,
            createdAt,
        });
    });

    it('refuse les paramètres invalides avant toute requête MongoDB', async () => {
        const findSpy = vi.spyOn(AuditLog, 'find');

        await expect(listPlatformAuditLogs({
            page: 0,
        })).rejects.toThrow(TypeError);

        await expect(listPlatformAuditLogs({
            workspaceId: 'invalid',
        })).rejects.toThrow(TypeError);

        await expect(listPlatformAuditLogs({
            actorId: 'invalid',
        })).rejects.toThrow(TypeError);

        await expect(listPlatformAuditLogs({
            from: new Date('2026-09-01T00:00:00.000Z'),
            to: new Date('2026-08-01T00:00:00.000Z'),
        })).rejects.toThrow(TypeError);

        expect(findSpy).not.toHaveBeenCalled();
    });
});
