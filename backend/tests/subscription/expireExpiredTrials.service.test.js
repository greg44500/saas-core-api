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
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import {
    DEFAULT_TRIAL_EXPIRATION_BATCH_SIZE,
    expireExpiredTrials,
} from '../../modules/subscriptions/services/expireExpiredTrials.service.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({ createAuditLog: vi.fn() }));
vi.mock('../../modules/subscriptions/subscription.model.js', () => ({
    Subscription: { find: vi.fn(), findOneAndUpdate: vi.fn() },
}));

const createFindChain = (candidates) => ({
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(candidates),
});

describe('expireExpiredTrials', () => {
    const session = { id: 'mongo-session' };
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
        vi.spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback(session));
        Subscription.find.mockReturnValue(createFindChain([]));
        Subscription.findOneAndUpdate.mockResolvedValue(expiredSubscription);
        createAuditLog.mockResolvedValue({ _id: 'audit-id' });
    });

    afterEach(() => vi.restoreAllMocks());

    it('refuse une date de traitement invalide', async () => {
        await expect(expireExpiredTrials({ now: new Date('invalid') }))
            .rejects.toBeInstanceOf(TypeError);
        expect(Subscription.find).not.toHaveBeenCalled();
    });

    it('refuse une taille de lot invalide', async () => {
        await expect(expireExpiredTrials({ now, batchSize: 0 }))
            .rejects.toBeInstanceOf(TypeError);
        expect(Subscription.find).not.toHaveBeenCalled();
    });

    it('borne et trie la sélection des trials échus', async () => {
        const chain = createFindChain([]);
        Subscription.find.mockReturnValue(chain);

        const result = await expireExpiredTrials({ now, batchSize: 25 });

        expect(chain.sort).toHaveBeenCalledWith({ trialEndsAt: 1, _id: 1 });
        expect(chain.limit).toHaveBeenCalledWith(25);
        expect(result).toEqual({
            processedAt: now,
            scanned: 0,
            expired: 0,
            skipped: 0,
            hasMore: false,
        });
    });

    it('expire un candidat et journalise la transition', async () => {
        Subscription.find.mockReturnValue(createFindChain([candidate]));

        const result = await expireExpiredTrials({ now });

        expect(Subscription.findOneAndUpdate).toHaveBeenCalledOnce();
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                actor: null,
                workspace: candidate.workspace,
                action: AUDIT_ACTION.SUBSCRIPTION_EXPIRED,
                entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: expiredSubscription._id,
                status: AUDIT_STATUS.SUCCESS,
            }),
            { session },
        );
        expect(result).toEqual({
            processedAt: now,
            scanned: 1,
            expired: 1,
            skipped: 0,
            hasMore: false,
        });
    });

    it('signale un lot plein pour permettre un nouveau passage', async () => {
        const candidates = Array.from(
            { length: DEFAULT_TRIAL_EXPIRATION_BATCH_SIZE },
            (_, index) => ({ ...candidate, _id: `candidate-${index}` }),
        );
        Subscription.find.mockReturnValue(createFindChain(candidates));

        const result = await expireExpiredTrials({ now });

        expect(result.hasMore).toBe(true);
        expect(result.scanned).toBe(DEFAULT_TRIAL_EXPIRATION_BATCH_SIZE);
    });

    it('ignore proprement une transition concurrente', async () => {
        Subscription.find.mockReturnValue(createFindChain([candidate]));
        Subscription.findOneAndUpdate.mockResolvedValue(null);

        const result = await expireExpiredTrials({ now });

        expect(result).toMatchObject({ expired: 0, skipped: 1, hasMore: false });
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('propage une erreur d’audit pour permettre le rollback et le retry', async () => {
        Subscription.find.mockReturnValue(createFindChain([candidate]));
        createAuditLog.mockRejectedValue(new Error('audit failure'));

        await expect(expireExpiredTrials({ now })).rejects.toThrow('audit failure');
    });
});
