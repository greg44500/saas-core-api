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
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    createPlan,
} from '../../../modules/plan/plan.service.js';

import {
    createPlatformPlan,
} from '../../../modules/platform/plans/services/createPlatformPlan.service.js';


vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/plan/plan.service.js',
    () => ({
        createPlan: vi.fn(),
    }),
);


describe('createPlatformPlan', () => {
    const actorId = '507f1f77bcf86cd799439011';

    const planData = {
        key: 'starter',
        name: 'Starter',
        description: 'Offre de démarrage',
        status: 'active',
        isPublic: true,
        displayOrder: 1,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 1990,
        priceYearlyExclTaxMinor: 19900,
        features: [
            'file_upload',
        ],
        limits: {
            members: 5,
            storage_bytes: 1073741824,
        },
    };

    const session = {
        id: 'mongo-session',
    };

    const createdPlan = {
        _id: {
            toString: () =>
                '507f1f77bcf86cd799439012',
        },
        key: 'starter',
        name: 'Starter',
        description: 'Offre de démarrage',
        status: 'active',
        isPublic: true,
        displayOrder: 1,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 1990,
        priceYearlyExclTaxMinor: 19900,
        features: [
            'file_upload',
        ],
        limits: new Map([
            ['members', 5],
            ['storage_bytes', 1073741824],
        ]),
        createdAt: new Date('2026-08-27T12:00:00.000Z'),
        updatedAt: new Date('2026-08-27T12:00:00.000Z'),
    };


    beforeEach(() => {
        vi.clearAllMocks();

        /**
         * Le mock exécute réellement le callback transactionnel afin de tester
         * l'orchestration du service sans dépendre d'une base MongoDB active.
         */
        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) =>
                callback(session),
        );

        createPlan.mockResolvedValue(
            createdPlan,
        );

        createAuditLog.mockResolvedValue({
            _id: 'audit-id',
        });
    });


    it('refuse la création lorsque planData est absent', async () => {
        await expect(
            createPlatformPlan({
                actorId,
            }),
        ).rejects.toThrow(TypeError);

        expect(createPlan).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('refuse la création lorsque actorId est absent', async () => {
        await expect(
            createPlatformPlan({
                planData,
            }),
        ).rejects.toThrow(TypeError);

        expect(createPlan).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('crée le plan dans la transaction courante', async () => {
        await createPlatformPlan({
            planData,
            actorId,
        });

        expect(createPlan).toHaveBeenCalledWith({
            planData,
            actorId,
            session,
        });
    });


    it('audite la création du plan dans la même transaction', async () => {
        await createPlatformPlan({
            planData,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

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
                    key: createdPlan.key,
                    name: createdPlan.name,
                    status: createdPlan.status,
                    isPublic: createdPlan.isPublic,
                },
            },
            {
                session,
            },
        );
    });


    it('retourne le DTO administratif du plan créé', async () => {
        const result =
            await createPlatformPlan({
                planData,
                actorId,
            });

        expect(result).toEqual({
            id: '507f1f77bcf86cd799439012',
            key: createdPlan.key,
            name: createdPlan.name,
            description: createdPlan.description,
            status: createdPlan.status,
            isPublic: createdPlan.isPublic,
            displayOrder: createdPlan.displayOrder,
            currency: createdPlan.currency,
            priceMonthlyExclTaxMinor:
                createdPlan.priceMonthlyExclTaxMinor,
            priceYearlyExclTaxMinor:
                createdPlan.priceYearlyExclTaxMinor,
            features: createdPlan.features,
            limits: {
                members: 5,
                storage_bytes: 1073741824,
            },
            createdAt: createdPlan.createdAt,
            updatedAt: createdPlan.updatedAt,
        });
    });


    it('propage une erreur provenant de la création du plan', async () => {
        const creationError =
            new Error('Plan creation failed');

        createPlan.mockRejectedValue(
            creationError,
        );

        await expect(
            createPlatformPlan({
                planData,
                actorId,
            }),
        ).rejects.toBe(creationError);

        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('propage une erreur provenant de l’AuditLog', async () => {
        const auditError =
            new Error('Audit failed');

        createAuditLog.mockRejectedValue(
            auditError,
        );

        await expect(
            createPlatformPlan({
                planData,
                actorId,
            }),
        ).rejects.toBe(auditError);

        expect(createPlan).toHaveBeenCalledOnce();
        expect(createAuditLog).toHaveBeenCalledOnce();
    });
});