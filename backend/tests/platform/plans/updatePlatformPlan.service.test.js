import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '../../../constants/auditActions.constants.js';
import { PLAN_STATUS } from '../../../constants/plan.constants.js';
import { createAuditLog } from '../../../modules/auditLog/auditLog.service.js';
import { Plan } from '../../../modules/plan/plan.model.js';
import { validatePlanCapabilities } from '../../../modules/plan/plan.service.js';
import { updatePlatformPlan } from '../../../modules/platform/plans/services/updatePlatformPlan.service.js';

vi.mock('../../../modules/auditLog/auditLog.service.js', () => ({ createAuditLog: vi.fn() }));
vi.mock('../../../modules/plan/plan.service.js', () => ({ validatePlanCapabilities: vi.fn() }));
vi.mock('../../../modules/plan/plan.model.js', () => ({
    Plan: {
        findOneAndUpdate: vi.fn(),
        findById: vi.fn(),
    },
}));

describe('updatePlatformPlan', () => {
    const actorId = '507f1f77bcf86cd799439011';
    const planId = '507f191e810c19729de860ea';
    const session = { id: 'mongo-session' };
    const planData = {
        name: 'Starter Plus',
        isPublic: true,
        trialEnabled: true,
        trialDurationDays: 14,
        features: ['file_upload'],
        limits: {
            members: 10,
            storage_bytes: 200000000,
            file_uploads_monthly: 200,
        },
    };
    const updatedPlan = {
        _id: { toString: () => planId },
        key: 'starter',
        name: 'Starter Plus',
        description: null,
        status: PLAN_STATUS.ACTIVE,
        isPublic: true,
        displayOrder: 1,
        trialEnabled: true,
        trialDurationDays: 14,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 2490,
        priceYearlyExclTaxMinor: 24900,
        features: ['file_upload'],
        limits: new Map(Object.entries(planData.limits)),
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        updatedAt: new Date('2026-08-27T10:00:00.000Z'),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => callback(session),
        );
        validatePlanCapabilities.mockReturnValue(undefined);
        Plan.findOneAndUpdate.mockResolvedValue(updatedPlan);
        createAuditLog.mockResolvedValue({ _id: 'audit-id' });
    });

    it('refuse les paramètres obligatoires manquants', async () => {
        await expect(updatePlatformPlan({ planId: null, planData, actorId }))
            .rejects.toBeInstanceOf(TypeError);
        expect(Plan.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('refuse explicitement l’archivage via la mise à jour générique', async () => {
        await expect(updatePlatformPlan({
            planId,
            planData: { status: PLAN_STATUS.ARCHIVED },
            actorId,
        })).rejects.toMatchObject({ statusCode: 409 });
        expect(Plan.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('valide les capabilities avant la transaction', async () => {
        await updatePlatformPlan({ planId, planData, actorId });
        expect(validatePlanCapabilities).toHaveBeenCalledWith(planData);
    });

    it('met à jour uniquement un plan non archivé et audite les champs modifiés', async () => {
        await updatePlatformPlan({
            planId,
            planData,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest-agent',
        });

        expect(Plan.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: planId, status: { $ne: PLAN_STATUS.ARCHIVED } },
            { $set: { ...planData, updatedBy: actorId } },
            { returnDocument: 'after', runValidators: true, session },
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLAN_UPDATED,
                entityType: AUDIT_ENTITY_TYPE.PLAN,
                entityId: updatedPlan._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
                metadata: { updatedFields: Object.keys(planData) },
            },
            { session },
        );
    });

    it('retourne le DTO administratif incluant le trial', async () => {
        const result = await updatePlatformPlan({ planId, planData, actorId });

        expect(result).toEqual({
            id: planId,
            key: 'starter',
            name: 'Starter Plus',
            description: null,
            status: PLAN_STATUS.ACTIVE,
            isPublic: true,
            displayOrder: 1,
            trialEnabled: true,
            trialDurationDays: 14,
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 2490,
            priceYearlyExclTaxMinor: 24900,
            features: ['file_upload'],
            limits: planData.limits,
            createdAt: updatedPlan.createdAt,
            updatedAt: updatedPlan.updatedAt,
        });
    });

    it('retourne 404 lorsque le plan n’existe pas', async () => {
        Plan.findOneAndUpdate.mockResolvedValue(null);
        Plan.findById.mockReturnValue({ session: vi.fn().mockResolvedValue(null) });

        await expect(updatePlatformPlan({ planId, planData, actorId }))
            .rejects.toMatchObject({ statusCode: 404 });
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('retourne 409 lorsque le plan existe mais est archivé', async () => {
        Plan.findOneAndUpdate.mockResolvedValue(null);
        Plan.findById.mockReturnValue({
            session: vi.fn().mockResolvedValue({ _id: planId, status: PLAN_STATUS.ARCHIVED }),
        });

        await expect(updatePlatformPlan({ planId, planData, actorId }))
            .rejects.toMatchObject({ statusCode: 409 });
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('propage une erreur de validation des capabilities', async () => {
        const error = new Error('Unknown capability');
        validatePlanCapabilities.mockImplementation(() => { throw error; });

        await expect(updatePlatformPlan({ planId, planData, actorId })).rejects.toBe(error);
        expect(Plan.findOneAndUpdate).not.toHaveBeenCalled();
    });
});
