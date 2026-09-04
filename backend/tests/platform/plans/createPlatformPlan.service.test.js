import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '../../../constants/auditActions.constants.js';
import { createAuditLog } from '../../../modules/auditLog/auditLog.service.js';
import { createPlan } from '../../../modules/plan/plan.service.js';
import { createPlatformPlan } from '../../../modules/platform/plans/services/createPlatformPlan.service.js';

vi.mock('../../../modules/auditLog/auditLog.service.js', () => ({ createAuditLog: vi.fn() }));
vi.mock('../../../modules/plan/plan.service.js', () => ({ createPlan: vi.fn() }));

describe('createPlatformPlan', () => {
    const actorId = '507f1f77bcf86cd799439011';
    const session = { id: 'mongo-session' };
    const planData = {
        name: 'Starter',
        description: 'Offre de démarrage',
        status: 'active',
        isPublic: true,
        displayOrder: 1,
        trialEnabled: true,
        trialDurationDays: 14,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 1990,
        priceYearlyExclTaxMinor: 19900,
        features: ['file_upload'],
        limits: {
            members: 5,
            storage_bytes: 1073741824,
            file_uploads_monthly: 100,
        },
    };
    const createdPlan = {
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        key: 'plan_507f1f77bcf86cd799439012',
        ...planData,
        limits: new Map(Object.entries(planData.limits)),
        createdAt: new Date('2026-08-27T12:00:00.000Z'),
        updatedAt: new Date('2026-08-27T12:00:00.000Z'),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => callback(session),
        );
        createPlan.mockResolvedValue(createdPlan);
        createAuditLog.mockResolvedValue({ _id: 'audit-id' });
    });

    it('refuse les paramètres obligatoires manquants', async () => {
        await expect(createPlatformPlan({ actorId })).rejects.toThrow(TypeError);
        await expect(createPlatformPlan({ planData })).rejects.toThrow(TypeError);
        expect(createPlan).not.toHaveBeenCalled();
    });

    it('crée et audite le plan dans la même transaction sans exposer sa clé', async () => {
        await createPlatformPlan({
            planData,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        expect(createPlan).toHaveBeenCalledWith({ planData, actorId, session });
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLAN_CREATED,
                entityType: AUDIT_ENTITY_TYPE.PLAN,
                entityId: createdPlan._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
                metadata: {
                    name: createdPlan.name,
                    status: createdPlan.status,
                    isPublic: createdPlan.isPublic,
                },
            },
            { session },
        );
    });

    it('retourne le DTO administratif sans clé technique', async () => {
        const result = await createPlatformPlan({ planData, actorId });

        expect(result).toEqual({
            id: '507f1f77bcf86cd799439012',
            isBaseline: false,
            name: createdPlan.name,
            description: createdPlan.description,
            status: createdPlan.status,
            isPublic: createdPlan.isPublic,
            displayOrder: createdPlan.displayOrder,
            trialEnabled: true,
            trialDurationDays: 14,
            currency: createdPlan.currency,
            priceMonthlyExclTaxMinor: 1990,
            priceYearlyExclTaxMinor: 19900,
            features: ['file_upload'],
            limits: planData.limits,
            createdAt: createdPlan.createdAt,
            updatedAt: createdPlan.updatedAt,
        });
        expect(result).not.toHaveProperty('key');
    });

    it('propage les erreurs de création ou d’audit', async () => {
        const creationError = new Error('Plan creation failed');
        createPlan.mockRejectedValueOnce(creationError);
        await expect(createPlatformPlan({ planData, actorId })).rejects.toBe(creationError);
        expect(createAuditLog).not.toHaveBeenCalled();

        createPlan.mockResolvedValueOnce(createdPlan);
        const auditError = new Error('Audit failed');
        createAuditLog.mockRejectedValueOnce(auditError);
        await expect(createPlatformPlan({ planData, actorId })).rejects.toBe(auditError);
    });
});
