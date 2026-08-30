import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    workspaceAuditLogQuerySchema,
} from '../../modules/auditLog/auditLog.validation.js';
import {
    describe,
    expect,
    it,
} from 'vitest';


describe('workspaceAuditLogQuerySchema', () => {
    it('applique les valeurs de pagination par défaut', () => {
        const result = workspaceAuditLogQuerySchema.parse({});

        expect(result).toEqual({
            page: 1,
            limit: 20,
        });
    });

    it('convertit les paramètres HTTP validés vers les types attendus', () => {
        const result = workspaceAuditLogQuerySchema.parse({
            page: '2',
            limit: '50',
            action: AUDIT_ACTION.WORKSPACE_UPDATED,
            actorId: '507f1f77bcf86cd799439011',
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
            status: AUDIT_STATUS.SUCCESS,
            from: '2026-08-01T08:00:00+02:00',
            to: '2026-08-30T18:00:00+02:00',
        });

        expect(result.page).toBe(2);
        expect(result.limit).toBe(50);
        expect(result.from).toBeInstanceOf(Date);
        expect(result.to).toBeInstanceOf(Date);
    });

    it('refuse une période inversée', () => {
        expect(() => workspaceAuditLogQuerySchema.parse({
            from: '2026-08-30T18:00:00+02:00',
            to: '2026-08-01T08:00:00+02:00',
        })).toThrow();
    });

    it('refuse les filtres inconnus', () => {
        expect(() => workspaceAuditLogQuerySchema.parse({
            unknown: 'value',
        })).toThrow();
    });
});
