import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import {
    AuditLog,
    MAX_METADATA_SIZE_BYTES,
} from '../../modules/auditLog/auditLog.model.js';


function createValidAuditLog(overrides = {}) {
    const entityId = new mongoose.Types.ObjectId();

    return new AuditLog({
        actor: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        action: AUDIT_ACTION.FILE_UPLOADED,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        entityId,
        status: AUDIT_STATUS.SUCCESS,
        ipAddress: '192.168.1.10',
        userAgent: 'Vitest',
        metadata: {
            originalName: 'document.pdf',
            sizeBytes: 1024,
        },
        ...overrides,
    });
}


describe('AuditLog model', () => {
    it('valide un événement d’audit complet', async () => {
        const auditLog = createValidAuditLog();

        await expect(auditLog.validate()).resolves.toBeUndefined();

        expect(auditLog.metadata).toEqual({
            originalName: 'document.pdf',
            sizeBytes: 1024,
        });

        expect(auditLog.updatedAt).toBeUndefined();
    });


    it('autorise une action anonyme sans actor', async () => {
        const auditLog = createValidAuditLog({
            actor: null,
            action: AUDIT_ACTION.LOGIN_FAILED,
            entityType: null,
            entityId: null,
            status: AUDIT_STATUS.FAILED,
            metadata: {
                reasonCode: 'INVALID_CREDENTIALS',
            },
        });

        await expect(auditLog.validate()).resolves.toBeUndefined();

        expect(auditLog.actor).toBeNull();
    });


    it('exige une action et un statut', async () => {
        const auditLog = createValidAuditLog({
            action: undefined,
            status: undefined,
        });

        const error = await auditLog.validate().catch(
            (validationError) => validationError,
        );

        expect(error.errors.action.kind).toBe('required');
        expect(error.errors.status.kind).toBe('required');
    });


    it('refuse une action ou un statut hors registre', async () => {
        const auditLog = createValidAuditLog({
            action: 'UNKNOWN_ACTION',
            status: 'unknown',
        });

        const error = await auditLog.validate().catch(
            (validationError) => validationError,
        );

        expect(error.errors.action.kind).toBe('enum');
        expect(error.errors.status.kind).toBe('enum');
    });


    it('exige entityType et entityId ensemble', async () => {
        const withoutEntityId = createValidAuditLog({
            entityId: null,
        });

        const withoutEntityType = createValidAuditLog({
            entityType: null,
        });

        await expect(withoutEntityId.validate()).rejects.toThrow(
            'entityType et entityId doivent être renseignés ensemble.',
        );

        await expect(withoutEntityType.validate()).rejects.toThrow(
            'entityType et entityId doivent être renseignés ensemble.',
        );
    });


    it('refuse une adresse IP invalide', async () => {
        const auditLog = createValidAuditLog({
            ipAddress: 'adresse-invalide',
        });

        await expect(auditLog.validate()).rejects.toThrow(
            'ipAddress doit contenir une adresse IP valide.',
        );
    });


    it('accepte les adresses IPv4 et IPv6', async () => {
        const ipv4AuditLog = createValidAuditLog({
            ipAddress: '203.0.113.10',
        });

        const ipv6AuditLog = createValidAuditLog({
            ipAddress: '2001:db8::1',
        });

        await expect(ipv4AuditLog.validate()).resolves.toBeUndefined();
        await expect(ipv6AuditLog.validate()).resolves.toBeUndefined();
    });


    it('refuse les propriétés sensibles dans metadata', async () => {
        const auditLog = createValidAuditLog({
            metadata: {
                request: {
                    refreshToken: 'secret-value',
                },
            },
        });

        await expect(auditLog.validate()).rejects.toThrow(
            'metadata contient une propriété sensible interdite.',
        );
    });


    it('refuse les metadata qui ne sont pas un objet simple', async () => {
        const auditLog = createValidAuditLog({
            metadata: ['unexpected-value'],
        });

        await expect(auditLog.validate()).rejects.toThrow(
            'metadata doit être un objet simple.',
        );
    });


    it('limite la taille sérialisée de metadata', async () => {
        const auditLog = createValidAuditLog({
            metadata: {
                description: 'a'.repeat(MAX_METADATA_SIZE_BYTES),
            },
        });

        await expect(auditLog.validate()).rejects.toThrow(
            'metadata dépasse la taille maximale autorisée.',
        );
    });


    it('déclare uniquement le timestamp createdAt', () => {
        expect(AuditLog.schema.path('createdAt')).toBeDefined();
        expect(AuditLog.schema.path('updatedAt')).toBeUndefined();
        expect(
            AuditLog.schema.path('createdAt').options.immutable,
        ).toBe(true);
    });


    it('déclare les index adaptés aux consultations chronologiques', () => {
        const indexedFields = AuditLog.schema.indexes().map(
            ([fields]) => fields,
        );

        expect(indexedFields).toEqual(
            expect.arrayContaining([
                { workspace: 1, createdAt: -1 },
                { actor: 1, createdAt: -1 },
                { organization: 1, createdAt: -1 },
                { action: 1, createdAt: -1 },
                {
                    entityType: 1,
                    entityId: 1,
                    createdAt: -1,
                },
                { createdAt: -1 },
            ]),
        );
    });


    it('bloque les mises à jour ordinaires', async () => {
        await expect(
            AuditLog.updateOne(
                { _id: new mongoose.Types.ObjectId() },
                { $set: { status: AUDIT_STATUS.FAILED } },
            ),
        ).rejects.toThrow(
            'Les journaux d’audit sont immuables',
        );
    });


    it('bloque les suppressions ordinaires', async () => {
        await expect(
            AuditLog.deleteOne({
                _id: new mongoose.Types.ObjectId(),
            }),
        ).rejects.toThrow(
            'Les journaux d’audit sont immuables',
        );
    });
});