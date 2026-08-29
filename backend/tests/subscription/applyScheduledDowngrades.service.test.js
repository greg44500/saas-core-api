import mongoose from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { AUDIT_ACTION } from '../../constants/auditActions.constants.js';
import {
    BILLING_INTERVAL,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_PLAN_CHANGE_TYPE,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import { applyScheduledDowngrades } from '../../modules/subscriptions/services/applyScheduledDowngrades.service.js';

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

const { ObjectId } = mongoose.Types;
const NOW = new Date('2026-10-01T00:00:00.000Z');
const EFFECTIVE_AT = new Date('2026-10-01T00:00:00.000Z');

const createCandidate = () => ({
    _id: new ObjectId(),
    workspace: new ObjectId(),
    plan: new ObjectId(),
    kind: SUBSCRIPTION_KIND.COMMERCIAL,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodStart: new Date('2026-09-01T00:00:00.000Z'),
    currentPeriodEnd: EFFECTIVE_AT,
    scheduledChange: {
        type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
        targetPlan: new ObjectId(),
        targetBillingInterval: BILLING_INTERVAL.MONTHLY,
        targetCurrency: 'EUR',
        targetPriceExclTaxMinor: 4900,
        effectiveAt: EFFECTIVE_AT,
        requestedAt: new Date('2026-09-02T00:00:00.000Z'),
        requestedBy: new ObjectId(),
    },
});

describe('applyScheduledDowngrades', () => {
    beforeEach(() => {
        vi.spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback({ id: 'session' }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('refuse une date de traitement invalide', async () => {
        await expect(
            applyScheduledDowngrades({ now: new Date('invalid') }),
        ).rejects.toBeInstanceOf(TypeError);
    });

    it('retourne zéro lorsqu’aucun downgrade n’est arrivé à échéance', async () => {
        vi.spyOn(Subscription, 'find').mockResolvedValue([]);

        await expect(applyScheduledDowngrades({ now: NOW }))
            .resolves.toEqual({
                processedAt: NOW,
                scanned: 0,
                applied: 0,
                skipped: 0,
            });
    });

    it('applique le snapshot cible et ouvre la nouvelle période mensuelle', async () => {
        const candidate = createCandidate();
        const updated = {
            ...candidate,
            plan: candidate.scheduledChange.targetPlan,
            currentPeriodStart: EFFECTIVE_AT,
            currentPeriodEnd: new Date('2026-11-01T00:00:00.000Z'),
            scheduledChange: null,
        };

        vi.spyOn(Subscription, 'find').mockResolvedValue([candidate]);
        const updateSpy = vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(updated);
        createAuditLog.mockResolvedValue({});

        const result = await applyScheduledDowngrades({ now: NOW });

        expect(result).toMatchObject({ scanned: 1, applied: 1, skipped: 0 });
        expect(updateSpy).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                $set: expect.objectContaining({
                    plan: candidate.scheduledChange.targetPlan,
                    billingInterval: BILLING_INTERVAL.MONTHLY,
                    currency: 'EUR',
                    priceExclTaxMinor: 4900,
                    currentPeriodStart: EFFECTIVE_AT,
                    currentPeriodEnd: new Date('2026-11-01T00:00:00.000Z'),
                    scheduledChange: null,
                }),
            }),
            expect.objectContaining({ session: expect.anything() }),
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.SUBSCRIPTION_DOWNGRADE_APPLIED,
                metadata: expect.objectContaining({
                    effectiveAt: EFFECTIVE_AT,
                    nextPeriodEnd: new Date('2026-11-01T00:00:00.000Z'),
                }),
            }),
            expect.objectContaining({ session: expect.anything() }),
        );
    });

    it('compte comme ignorée une transition gagnée par une requête concurrente', async () => {
        const candidate = createCandidate();
        vi.spyOn(Subscription, 'find').mockResolvedValue([candidate]);
        vi.spyOn(Subscription, 'findOneAndUpdate').mockResolvedValue(null);

        const result = await applyScheduledDowngrades({ now: NOW });

        expect(result).toMatchObject({ scanned: 1, applied: 0, skipped: 1 });
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('propage une erreur d’audit pour permettre le rollback transactionnel', async () => {
        const candidate = createCandidate();
        vi.spyOn(Subscription, 'find').mockResolvedValue([candidate]);
        vi.spyOn(Subscription, 'findOneAndUpdate').mockResolvedValue({
            ...candidate,
            scheduledChange: null,
        });
        createAuditLog.mockRejectedValue(new Error('audit failed'));

        await expect(applyScheduledDowngrades({ now: NOW }))
            .rejects.toThrow('audit failed');
    });
});
