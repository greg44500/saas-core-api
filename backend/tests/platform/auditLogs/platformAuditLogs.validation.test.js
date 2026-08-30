import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    platformAuditLogQuerySchema,
} from '../../../modules/platform/auditLogs/platformAuditLogs.validation.js';
import {
    describe,
    expect,
    it,
} from 'vitest';


describe('platformAuditLogQuerySchema', () => {
    it('applique les valeurs de pagination par défaut', () => {
        const result = platformAuditLogQuerySchema.parse({});

        expect(result).toEqual({
            page: 1,
            limit: 20,
        });
    });

    it('valide et normalise les filtres supportés', () => {
        const result = platformAuditLogQuerySchema.parse({
            page: '2',
            limit: '10',
            workspaceId: '507f1f77bcf86cd799439011',
            actorId: '507f191e810c19729de860ea',
            action: AUDIT_ACTION.WORKSPACE_UPDATED,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
            status: AUDIT_STATUS.SUCCESS,
            from: '2026-08-01T00:00:00.000+00:00',
            to: '2026-08-31T23:59:59.999+00:00',
        });

        expect(result.page).toBe(2);
        expect(result.limit).toBe(10);
        expect(result.workspaceId).toBe(
            '507f1f77bcf86cd799439011',
        );
        expect(result.actorId).toBe(
            '507f191e810c19729de860ea',
        );
        expect(result.action).toBe(
            AUDIT_ACTION.WORKSPACE_UPDATED,
        );
        expect(result.entityType).toBe(
            AUDIT_ENTITY_TYPE.WORKSPACE,
        );
        expect(result.status).toBe(
            AUDIT_STATUS.SUCCESS,
        );
        expect(result.from).toBeInstanceOf(Date);
        expect(result.to).toBeInstanceOf(Date);
    });

    it('refuse les paramètres inconnus et les périodes inversées', () => {
        expect(() => platformAuditLogQuerySchema.parse({
            workspace: '507f1f77bcf86cd799439011',
        })).toThrow();

        expect(() => platformAuditLogQuerySchema.parse({
            from: '2026-09-01T00:00:00.000+00:00',
            to: '2026-08-01T00:00:00.000+00:00',
        })).toThrow();
    });

    it('refuse les identifiants et enums invalides', () => {
        expect(() => platformAuditLogQuerySchema.parse({
            workspaceId: 'invalid',
        })).toThrow();

        expect(() => platformAuditLogQuerySchema.parse({
            actorId: 'invalid',
        })).toThrow();

        expect(() => platformAuditLogQuerySchema.parse({
            action: 'UNKNOWN_ACTION',
        })).toThrow();
    });
});
