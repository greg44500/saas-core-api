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

import {
    PLAN_STATUS,
} from '../../../constants/plan.constants.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    Plan,
} from '../../../modules/plan/plan.model.js';

import {
    archivePlatformPlan,
} from '../../../modules/platform/plans/services/archivePlatformPlan.service.js';


vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/plan/plan.model.js',
    () => ({
        Plan: {
            findOneAndUpdate: vi.fn(),
            findById: vi.fn(),
        },
    }),
);


describe('archivePlatformPlan', () => {
    const actorId =
        '507f1f77bcf86cd799439011';

    const planId =
        '507f191e810c19729de860ea';

    const session = {
        id: 'mongo-session',
    };

    const archivedPlan = {
        _id: {
            toString: () => planId,
        },
        key: 'starter',
        status: PLAN_STATUS.ARCHIVED,
        isPublic: false,
        updatedAt:
            new Date('2026-08-27T12:00:00.000Z'),
    };


    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) =>
                callback(session),
        );

        Plan.findOneAndUpdate
            .mockResolvedValue(archivedPlan);

        createAuditLog
            .mockResolvedValue({
                _id: 'audit-id',
            });
    });


    it('refuse les paramètres obligatoires manquants', async () => {
        await expect(
            archivePlatformPlan({
                planId: null,
                actorId,
            }),
        ).rejects.toBeInstanceOf(
            TypeError,
        );

        expect(
            Plan.findOneAndUpdate,
        ).not.toHaveBeenCalled();
    });


    it('archive uniquement un plan qui ne l’est pas encore', async () => {
        await archivePlatformPlan({
            planId,
            actorId,
        });

        expect(
            Plan.findOneAndUpdate,
        ).toHaveBeenCalledWith(
            {
                _id: planId,
                status: {
                    $ne:
                        PLAN_STATUS.ARCHIVED,
                },
            },
            {
                $set: {
                    status:
                        PLAN_STATUS.ARCHIVED,
                    isPublic: false,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
    });


    it('rend le plan non public lors de son archivage', async () => {
        const result =
            await archivePlatformPlan({
                planId,
                actorId,
            });

        expect(result.isPublic).toBe(false);
        expect(result.status).toBe(
            PLAN_STATUS.ARCHIVED,
        );
    });


    it('crée un audit PLAN_ARCHIVED dans la même transaction', async () => {
        await archivePlatformPlan({
            planId,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest-agent',
        });

        expect(
            createAuditLog,
        ).toHaveBeenCalledWith(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.PLAN_ARCHIVED,
                entityType:
                    AUDIT_ENTITY_TYPE.PLAN,
                entityId:
                    archivedPlan._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
                metadata: {
                    archived: true,
                },
            },
            {
                session,
            },
        );
    });


    it('retourne le DTO administratif du plan archivé', async () => {
        const result =
            await archivePlatformPlan({
                planId,
                actorId,
            });

        expect(result).toEqual({
            id: planId,
            key: 'starter',
            status:
                PLAN_STATUS.ARCHIVED,
            isPublic: false,
            updatedAt:
                archivedPlan.updatedAt,
        });
    });


    it('retourne 404 lorsque le plan n’existe pas', async () => {
        Plan.findOneAndUpdate
            .mockResolvedValue(null);

        Plan.findById
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue(
                            null,
                        ),
            });

        await expect(
            archivePlatformPlan({
                planId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });


    it('retourne 409 lorsque le plan est déjà archivé', async () => {
        Plan.findOneAndUpdate
            .mockResolvedValue(null);

        Plan.findById
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue({
                            _id: planId,
                            status:
                                PLAN_STATUS.ARCHIVED,
                        }),
            });

        await expect(
            archivePlatformPlan({
                planId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });


    it('propage une erreur de création de l’AuditLog', async () => {
        const error =
            new Error(
                'Audit failure',
            );

        createAuditLog
            .mockRejectedValue(error);

        await expect(
            archivePlatformPlan({
                planId,
                actorId,
            }),
        ).rejects.toBe(error);
    });
});