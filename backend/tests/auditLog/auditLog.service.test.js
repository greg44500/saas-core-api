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
});