import mongoose from 'mongoose';

import {
    afterEach,
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
} from '../../constants/auditActions.constants.js';

import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';

import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';

import {
    expireExpiredTrials,
} from '../../modules/subscriptions/services/expireExpiredTrials.service.js';

import {
    Subscription,
} from '../../modules/subscriptions/subscription.model.js';


vi.mock(
    '../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);

vi.mock(
    '../../modules/subscriptions/subscription.model.js',
    () => ({
        Subscription: {
            find: vi.fn(),
            findOneAndUpdate: vi.fn(),
        },
    }),
);


describe('expireExpiredTrials', () => {
    const session = {
        id: 'mongo-session',
    };

    const now = new Date('2026-08-29T12:00:00.000Z');

    const candidate = {
        _id: '507f191e810c19729de860ea',
        workspace: '507f1f77bcf86cd799439011',
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.TRIALING,
        trialEndsAt: new Date('2026-08-29T10:00:00.000Z'),
    };

    const expiredSubscription = {
        ...candidate,
        status: SUBSCRIPTION_STATUS.EXPIRED,
        currentPeriodEnd: candidate.trialEndsAt,
    };


    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );

        Subscription.find.mockResolvedValue([]);
        Subscription.findOneAndUpdate.mockResolvedValue(
            expiredSubscription,
        );
        createAuditLog.mockResolvedValue({
            _id: 'audit-id',
        });
    });


    afterEach(() => {
        vi.restoreAllMocks();
    });


    it('refuse une date de traitement invalide', async () => {
        await expect(
            expireExpiredTrials({
                now: new Date('invalid'),
            }),
        ).rejects.toBeInstanceOf(TypeError);

        expect(Subscription.find).not.toHaveBeenCalled();
        expect(
            mongoose.connection.transaction,
        ).not.toHaveBeenCalled();
    });


    it('ne démarre aucune transaction lorsqu’aucun trial n’est arrivé à échéance', async () => {
        const result = await expireExpiredTrials({ now });

        expect(Subscription.find).toHaveBeenCalledOnce();
        expect(Subscription.find).toHaveBeenCalledWith({
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
            trialEndsAt: mongoose.trusted({
                $type: 'date',
                $lte: now,
            }),
        });

        expect(
            mongoose.connection.transaction,
        ).not.toHaveBeenCalled();

        expect(result).toEqual({
            processedAt: now,
            scanned: 0,
            expired: 0,
            skipped: 0,
        });
    });


    it('fait passer un trial commercial arrivé à échéance vers expired', async () => {
        Subscription.find.mockResolvedValue([
            candidate,
        ]);

        const result = await expireExpiredTrials({ now });

        expect(
            Subscription.findOneAndUpdate,
        ).toHaveBeenCalledOnce();

        expect(
            Subscription.findOneAndUpdate,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: candidate._id,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.TRIALING,
            }),
            {
                $set: {
                    status: SUBSCRIPTION_STATUS.EXPIRED,
                    cancelAtPeriodEnd: false,
                    currentPeriodEnd: candidate.trialEndsAt,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        expect(result).toEqual({
            processedAt: now,
            scanned: 1,
            expired: 1,
            skipped: 0,
        });
    });


    it('utilise trialEndsAt comme date d’effet et journalise une action système', async () => {
        Subscription.find.mockResolvedValue([
            candidate,
        ]);

        await expireExpiredTrials({ now });

        expect(createAuditLog).toHaveBeenCalledOnce();
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: null,
                workspace: candidate.workspace,
                action: AUDIT_ACTION.SUBSCRIPTION_EXPIRED,
                entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: expiredSubscription._id,
                status: AUDIT_STATUS.SUCCESS,
                metadata: {
                    reason: 'trial_natural_expiration',
                    previousStatus: SUBSCRIPTION_STATUS.TRIALING,
                    newStatus: SUBSCRIPTION_STATUS.EXPIRED,
                    effectiveAt: candidate.trialEndsAt,
                    processedAt: now,
                    baselineFallbackEnabled: true,
                    trialEligibilityPreserved: true,
                },
            },
            { session },
        );
    });


    it('ignore proprement un trial modifié par une opération concurrente', async () => {
        Subscription.find.mockResolvedValue([
            candidate,
        ]);
        Subscription.findOneAndUpdate.mockResolvedValue(null);

        const result = await expireExpiredTrials({ now });

        expect(createAuditLog).not.toHaveBeenCalled();

        expect(result).toEqual({
            processedAt: now,
            scanned: 1,
            expired: 0,
            skipped: 1,
        });
    });


    it('compte séparément les expirations réussies et les transitions concurrentes', async () => {
        const secondCandidate = {
            ...candidate,
            _id: '507f191e810c19729de860eb',
            workspace: '507f1f77bcf86cd799439012',
        };

        Subscription.find.mockResolvedValue([
            candidate,
            secondCandidate,
        ]);

        Subscription.findOneAndUpdate
            .mockResolvedValueOnce(expiredSubscription)
            .mockResolvedValueOnce(null);

        const result = await expireExpiredTrials({ now });

        expect(
            mongoose.connection.transaction,
        ).toHaveBeenCalledTimes(2);
        expect(createAuditLog).toHaveBeenCalledOnce();

        expect(result).toEqual({
            processedAt: now,
            scanned: 2,
            expired: 1,
            skipped: 1,
        });
    });


    it('propage une erreur d’audit pour ne pas valider silencieusement la transition', async () => {
        Subscription.find.mockResolvedValue([
            candidate,
        ]);
        createAuditLog.mockRejectedValue(
            new Error('audit failure'),
        );

        await expect(
            expireExpiredTrials({ now }),
        ).rejects.toThrow('audit failure');
    });
});
