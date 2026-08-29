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
} from '../../constants/auditActions.constants.js';
import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    cancelActiveSubscriptionImmediately,
    finalizeScheduledCancellations,
    resumeScheduledSubscriptionCancellation,
    scheduleActiveSubscriptionCancellation,
} from '../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js';


vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

const { ObjectId } = mongoose.Types;

const NOW = new Date('2026-08-29T12:00:00.000Z');
const PERIOD_END = new Date('2026-09-29T12:00:00.000Z');

const createSubscription = (overrides = {}) => ({
    _id: new ObjectId(),
    workspace: new ObjectId(),
    plan: new ObjectId(),
    kind: SUBSCRIPTION_KIND.COMMERCIAL,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodStart: new Date('2026-08-29T10:00:00.000Z'),
    currentPeriodEnd: PERIOD_END,
    trialEndsAt: new Date('2026-09-10T10:00:00.000Z'),
    cancelAtPeriodEnd: false,
    billingInterval: BILLING_INTERVAL.MONTHLY,
    currency: 'EUR',
    priceExclTaxMinor: 1990,
    provider: BILLING_PROVIDER.MANUAL,
    updatedAt: NOW,
    ...overrides,
});

const queryResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});


describe('active subscription lifecycle', () => {
    beforeEach(() => {
        vi.spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback({ id: 'session' }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('programme une annulation à la fin de la période sans couper immédiatement les droits', async () => {
        const actorId = new ObjectId();
        const subscription = createSubscription();
        const updated = createSubscription({
            ...subscription,
            cancelAtPeriodEnd: true,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        const updateSpy = vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(updated);
        createAuditLog.mockResolvedValue({});

        const result = await scheduleActiveSubscriptionCancellation({
            subscriptionId: subscription._id,
            actorId,
            reason: 'user_requested',
            now: NOW,
        });

        expect(updateSpy).toHaveBeenCalledOnce();
        expect(result.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
        expect(result.cancelAtPeriodEnd).toBe(true);
        expect(result.currentPeriodEnd).toEqual(PERIOD_END);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.SUBSCRIPTION_CANCELLATION_SCHEDULED,
                metadata: expect.objectContaining({
                    effectiveAt: PERIOD_END,
                }),
            }),
            expect.objectContaining({ session: expect.anything() }),
        );
    });

    it('refuse de programmer deux fois la même annulation', async () => {
        const subscription = createSubscription({
            cancelAtPeriodEnd: true,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        const updateSpy = vi.spyOn(Subscription, 'findOneAndUpdate');

        await expect(
            scheduleActiveSubscriptionCancellation({
                subscriptionId: subscription._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(updateSpy).not.toHaveBeenCalled();
    });

    it('refuse de programmer l’annulation de la baseline Free', async () => {
        const subscription = createSubscription({
            kind: SUBSCRIPTION_KIND.BASELINE,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));

        await expect(
            scheduleActiveSubscriptionCancellation({
                subscriptionId: subscription._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse une annulation différée lorsque la période est déjà terminée', async () => {
        const subscription = createSubscription({
            currentPeriodEnd: NOW,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));

        await expect(
            scheduleActiveSubscriptionCancellation({
                subscriptionId: subscription._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('retire une annulation programmée avant son échéance', async () => {
        const actorId = new ObjectId();
        const subscription = createSubscription({
            cancelAtPeriodEnd: true,
        });
        const updated = createSubscription({
            ...subscription,
            cancelAtPeriodEnd: false,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(updated);
        createAuditLog.mockResolvedValue({});

        const result = await resumeScheduledSubscriptionCancellation({
            subscriptionId: subscription._id,
            actorId,
            now: NOW,
        });

        expect(result.cancelAtPeriodEnd).toBe(false);
        expect(result.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.SUBSCRIPTION_RESUMED,
            }),
            expect.any(Object),
        );
    });

    it('refuse une reprise lorsqu’aucune annulation n’est programmée', async () => {
        const subscription = createSubscription();

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));

        await expect(
            resumeScheduledSubscriptionCancellation({
                subscriptionId: subscription._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('annule immédiatement une souscription commerciale active sans calcul de prorata', async () => {
        const actorId = new ObjectId();
        const subscription = createSubscription();
        const updated = createSubscription({
            ...subscription,
            status: SUBSCRIPTION_STATUS.CANCELED,
            currentPeriodEnd: NOW,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(updated);
        createAuditLog.mockResolvedValue({});

        const result = await cancelActiveSubscriptionImmediately({
            subscriptionId: subscription._id,
            actorId,
            reason: 'administrative_decision',
            canceledAt: NOW,
        });

        expect(result.status).toBe(SUBSCRIPTION_STATUS.CANCELED);
        expect(result.currentPeriodEnd).toEqual(NOW);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.SUBSCRIPTION_CANCELED,
                metadata: expect.objectContaining({
                    mode: 'immediate',
                    previousPeriodEnd: PERIOD_END,
                    effectiveAt: NOW,
                }),
            }),
            expect.any(Object),
        );
    });

    it('refuse l’annulation immédiate d’une souscription qui n’est plus active', async () => {
        const subscription = createSubscription({
            status: SUBSCRIPTION_STATUS.CANCELED,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));

        await expect(
            cancelActiveSubscriptionImmediately({
                subscriptionId: subscription._id,
                actorId: new ObjectId(),
                reason: 'test',
                canceledAt: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse proprement une transition perdue à cause d’une concurrence', async () => {
        const subscription = createSubscription();

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(null);

        await expect(
            scheduleActiveSubscriptionCancellation({
                subscriptionId: subscription._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('finalise les annulations programmées arrivées à échéance', async () => {
        const candidate = createSubscription({
            cancelAtPeriodEnd: true,
            currentPeriodEnd: new Date('2026-08-29T11:00:00.000Z'),
        });
        const updated = createSubscription({
            ...candidate,
            status: SUBSCRIPTION_STATUS.CANCELED,
            cancelAtPeriodEnd: false,
        });

        vi.spyOn(Subscription, 'find').mockResolvedValue([candidate]);
        vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(updated);
        createAuditLog.mockResolvedValue({});

        const result = await finalizeScheduledCancellations({ now: NOW });

        expect(result).toEqual({
            processedAt: NOW,
            scanned: 1,
            canceled: 1,
            skipped: 0,
        });
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                actor: null,
                action: AUDIT_ACTION.SUBSCRIPTION_CANCELED,
                metadata: expect.objectContaining({
                    mode: 'period_end',
                    baselineFallbackEnabled: true,
                }),
            }),
            expect.any(Object),
        );
    });

    it('compte comme skipped un candidat déjà traité concurremment', async () => {
        const candidate = createSubscription({
            cancelAtPeriodEnd: true,
            currentPeriodEnd: new Date('2026-08-29T11:00:00.000Z'),
        });

        vi.spyOn(Subscription, 'find').mockResolvedValue([candidate]);
        vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(null);

        const result = await finalizeScheduledCancellations({ now: NOW });

        expect(result.canceled).toBe(0);
        expect(result.skipped).toBe(1);
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('propage un échec AuditLog pour laisser la transaction annuler la mutation', async () => {
        const candidate = createSubscription({
            cancelAtPeriodEnd: true,
            currentPeriodEnd: new Date('2026-08-29T11:00:00.000Z'),
        });

        vi.spyOn(Subscription, 'find').mockResolvedValue([candidate]);
        vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(createSubscription({
                ...candidate,
                status: SUBSCRIPTION_STATUS.CANCELED,
            }));
        createAuditLog.mockRejectedValue(new Error('audit unavailable'));

        await expect(
            finalizeScheduledCancellations({ now: NOW }),
        ).rejects.toThrow('audit unavailable');
    });

    it('valide strictement les dates système injectées', async () => {
        const findSpy = vi.spyOn(Subscription, 'find');

        await expect(
            finalizeScheduledCancellations({ now: new Date('invalid') }),
        ).rejects.toThrow('now must be a valid Date');

        expect(findSpy).not.toHaveBeenCalled();
    });
});
