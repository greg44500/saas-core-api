import mongoose from 'mongoose';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import { AuditLog } from '../../modules/auditLog/auditLog.model.js';

import {
    createAuditLog,
    listWorkspaceAuditLogs,
} from '../../modules/auditLog/auditLog.service.js';


function createValidAuditData(overrides = {}) {
    const workspaceId = new mongoose.Types.ObjectId();

    return {
        actor: new mongoose.Types.ObjectId(),
        workspace: workspaceId,
        action: AUDIT_ACTION.WORKSPACE_CREATED,
        entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
        entityId: workspaceId,
        status: AUDIT_STATUS.SUCCESS,
        ipAddress: '203.0.113.10',
        userAgent: 'Vitest',
        metadata: {
            source: 'workspace-service',
        },
        ...overrides,
    };
}


function createFindQueryMock(documents) {
    const query = {
        select: vi.fn(),
        populate: vi.fn(),
        sort: vi.fn(),
        skip: vi.fn(),
        limit: vi.fn(),
        lean: vi.fn().mockResolvedValue(documents),
    };

    query.select.mockReturnValue(query);
    query.populate.mockReturnValue(query);
    query.sort.mockReturnValue(query);
    query.skip.mockReturnValue(query);
    query.limit.mockReturnValue(query);

    return query;
}


describe('AuditLog service', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });


    it('construit et persiste un événement d’audit', async () => {
        const auditData = createValidAuditData();

        const saveSpy = vi
            .spyOn(AuditLog.prototype, 'save')
            .mockImplementation(async function saveAuditLog() {
                return this;
            });

        const auditLog = await createAuditLog(auditData);

        expect(saveSpy).toHaveBeenCalledWith({});

        expect(auditLog).toMatchObject({
            actor: auditData.actor,
            workspace: auditData.workspace,
            action: auditData.action,
            entityType: auditData.entityType,
            entityId: auditData.entityId,
            status: auditData.status,
            ipAddress: auditData.ipAddress,
            userAgent: auditData.userAgent,
            metadata: auditData.metadata,
        });
    });


    it('transmet la session MongoDB à la persistance', async () => {
        const session = {
            id: 'mongo-session',
        };

        const saveSpy = vi
            .spyOn(AuditLog.prototype, 'save')
            .mockImplementation(async function saveAuditLog() {
                return this;
            });

        await createAuditLog(
            createValidAuditData(),
            { session },
        );

        expect(saveSpy).toHaveBeenCalledWith({
            session,
        });
    });


    it('propage une erreur de persistance sans la masquer', async () => {
        const persistenceError = new Error(
            'MongoDB indisponible',
        );

        vi.spyOn(AuditLog.prototype, 'save')
            .mockRejectedValue(persistenceError);

        await expect(
            createAuditLog(createValidAuditData()),
        ).rejects.toBe(persistenceError);
    });


    it('ignore les propriétés réservées fournies par un appelant', async () => {
        const suppliedId = new mongoose.Types.ObjectId();
        const suppliedCreatedAt = new Date('2000-01-01');

        vi.spyOn(AuditLog.prototype, 'save')
            .mockImplementation(async function saveAuditLog() {
                return this;
            });

        const auditLog = await createAuditLog({
            ...createValidAuditData(),
            _id: suppliedId,
            createdAt: suppliedCreatedAt,
            unexpectedProperty: 'forbidden',
        });

        expect(auditLog._id).not.toEqual(suppliedId);
        expect(auditLog.createdAt).toBeUndefined();
        expect(auditLog.unexpectedProperty).toBeUndefined();
    });


    it('liste les AuditLogs du workspace avec un DTO volontairement limité', async () => {
        const workspaceId = new mongoose.Types.ObjectId();
        const actorId = new mongoose.Types.ObjectId();
        const entityId = new mongoose.Types.ObjectId();
        const auditLogId = new mongoose.Types.ObjectId();
        const createdAt = new Date('2026-08-30T08:00:00.000Z');

        const findQuery = createFindQueryMock([
            {
                _id: auditLogId,
                actor: {
                    _id: actorId,
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    email: 'ada@example.com',
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
            .mockReturnValue(findQuery);

        const countDocumentsSpy = vi
            .spyOn(AuditLog, 'countDocuments')
            .mockResolvedValue(21);

        const result = await listWorkspaceAuditLogs({
            workspaceId,
            page: 2,
            limit: 10,
        });

        expect(findSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace: expect.any(mongoose.Types.ObjectId),
            }),
        );
        expect(
            findSpy.mock.calls[0][0].workspace.toString(),
        ).toBe(workspaceId.toString());

        expect(findQuery.select).toHaveBeenCalledWith(
            '_id actor action entityType entityId status createdAt',
        );
        expect(findQuery.populate).toHaveBeenCalledWith({
            path: 'actor',
            select: '_id firstName lastName email',
        });
        expect(findQuery.sort).toHaveBeenCalledWith({
            createdAt: -1,
            _id: -1,
        });
        expect(findQuery.skip).toHaveBeenCalledWith(10);
        expect(findQuery.limit).toHaveBeenCalledWith(10);
        expect(countDocumentsSpy).toHaveBeenCalledTimes(1);

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


    it('construit uniquement les filtres AuditLog explicitement supportés', async () => {
        const workspaceId = new mongoose.Types.ObjectId();
        const actorId = new mongoose.Types.ObjectId();
        const from = new Date('2026-08-01T00:00:00.000Z');
        const to = new Date('2026-08-31T23:59:59.999Z');

        const findQuery = createFindQueryMock([]);

        const findSpy = vi
            .spyOn(AuditLog, 'find')
            .mockReturnValue(findQuery);

        vi.spyOn(AuditLog, 'countDocuments')
            .mockResolvedValue(0);

        await listWorkspaceAuditLogs({
            workspaceId,
            action: AUDIT_ACTION.MEMBER_REMOVED,
            actorId,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
            status: AUDIT_STATUS.SUCCESS,
            from,
            to,
        });

        const filter = findSpy.mock.calls[0][0];

        expect(filter.workspace.toString()).toBe(workspaceId.toString());
        expect(filter.action).toBe(AUDIT_ACTION.MEMBER_REMOVED);
        expect(filter.actor.toString()).toBe(actorId.toString());
        expect(filter.entityType).toBe(
            AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
        );
        expect(filter.status).toBe(AUDIT_STATUS.SUCCESS);
        expect(filter.createdAt.$gte).toBe(from);
        expect(filter.createdAt.$lte).toBe(to);
    });


    it('gère les événements système sans acteur ni ressource', async () => {
        const workspaceId = new mongoose.Types.ObjectId();
        const auditLogId = new mongoose.Types.ObjectId();
        const createdAt = new Date('2026-08-30T09:00:00.000Z');

        const findQuery = createFindQueryMock([
            {
                _id: auditLogId,
                actor: null,
                action: AUDIT_ACTION.SUBSCRIPTION_EXPIRED,
                entityType: null,
                entityId: null,
                status: AUDIT_STATUS.SUCCESS,
                createdAt,
            },
        ]);

        vi.spyOn(AuditLog, 'find')
            .mockReturnValue(findQuery);
        vi.spyOn(AuditLog, 'countDocuments')
            .mockResolvedValue(1);

        const result = await listWorkspaceAuditLogs({
            workspaceId,
        });

        expect(result.auditLogs[0]).toEqual({
            id: auditLogId.toString(),
            actor: null,
            action: AUDIT_ACTION.SUBSCRIPTION_EXPIRED,
            status: AUDIT_STATUS.SUCCESS,
            entity: null,
            createdAt,
        });
    });


    it('refuse les paramètres de lecture invalides avant toute requête', async () => {
        const workspaceId = new mongoose.Types.ObjectId();
        const findSpy = vi.spyOn(AuditLog, 'find');

        await expect(
            listWorkspaceAuditLogs({
                workspaceId: 'invalid-workspace-id',
            }),
        ).rejects.toThrow(TypeError);

        await expect(
            listWorkspaceAuditLogs({
                workspaceId,
                action: 'UNKNOWN_ACTION',
            }),
        ).rejects.toThrow(TypeError);

        await expect(
            listWorkspaceAuditLogs({
                workspaceId,
                actorId: 'invalid-actor-id',
            }),
        ).rejects.toThrow(TypeError);

        await expect(
            listWorkspaceAuditLogs({
                workspaceId,
                from: new Date('2026-09-01T00:00:00.000Z'),
                to: new Date('2026-08-01T00:00:00.000Z'),
            }),
        ).rejects.toThrow(TypeError);

        expect(findSpy).not.toHaveBeenCalled();
    });
});