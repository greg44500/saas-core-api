import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    COMMERCIAL_INVITATION_STATUS,
} from '../../constants/commercialInvitation.constants.js';
import {
    BILLING_INTERVAL,
} from '../../constants/subscription.constants.js';
import {
    createCommercialInvitation,
} from '../../modules/commercialInvitation/commercialInvitation.service.js';
import { CommercialInvitation } from '../../modules/commercialInvitation/commercialInvitation.model.js';
import { Plan } from '../../modules/plan/plan.model.js';
import { User } from '../../modules/users/user.model.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';

vi.mock('mongoose', () => ({
    default: {
        connection: {
            transaction: vi.fn(),
        },
        trusted: (value) => value,
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../modules/commercialInvitation/commercialInvitation.model.js', () => ({
    CommercialInvitation: {
        updateMany: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock('../../modules/plan/plan.model.js', () => ({
    Plan: {
        findById: vi.fn(),
    },
}));

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        exists: vi.fn(),
    },
}));

const sessionResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const selectedSessionResult = (value) => ({
    select() {
        return this;
    },
    session: vi.fn().mockResolvedValue(value),
});

const buildPlan = () => ({
    _id: 'plan-id',
    name: 'Découverte',
    status: 'active',
    isPublic: false,
    systemRole: null,
    trialEnabled: false,
    trialDurationDays: null,
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 0,
    priceYearlyExclTaxMinor: 0,
    features: ['file_upload'],
    limits: new Map([['members', 1]]),
});

const setup = () => {
    const session = { id: 'session' };
    const plan = buildPlan();
    const invitation = {
        _id: 'invitation-id',
        emailCanonical: 'beta@example.com',
        plan: plan._id,
        workspaceName: 'Beta Workspace',
        reason: 'Programme beta septembre',
        status: COMMERCIAL_INVITATION_STATUS.PENDING,
    };

    mongoose.connection.transaction.mockImplementation(
        async (callback) => callback(session),
    );
    User.findOne.mockReturnValue(selectedSessionResult(null));
    Plan.findById.mockReturnValue(sessionResult(plan));
    CommercialInvitation.updateMany.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
    });
    CommercialInvitation.findOne.mockReturnValue(sessionResult(null));
    CommercialInvitation.create.mockResolvedValue([invitation]);
    createAuditLog.mockResolvedValue(undefined);

    return { invitation, plan, session };
};


describe('createCommercialInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('persiste la justification, le hash du secret et le snapshot du Plan', async () => {
        const { invitation, plan, session } = setup();

        const result = await createCommercialInvitation({
            email: 'Beta@Example.com',
            planId: 'plan-id',
            workspaceName: 'Beta Workspace',
            billingInterval: BILLING_INTERVAL.NONE,
            reason: 'Programme beta septembre',
            actorId: 'actor-id',
            now: new Date('2026-09-08T12:00:00.000Z'),
        });

        expect(CommercialInvitation.create).toHaveBeenCalledWith(
            [expect.objectContaining({
                emailCanonical: 'beta@example.com',
                plan: plan._id,
                workspaceName: 'Beta Workspace',
                reason: 'Programme beta septembre',
                tokenHash: expect.stringMatching(/^[a-f\d]{64}$/),
                offerSnapshot: expect.objectContaining({
                    planName: 'Découverte',
                    billingInterval: BILLING_INTERVAL.NONE,
                    priceExclTaxMinor: 0,
                }),
            })],
            { session },
        );
        expect(result.invitation).toBe(invitation);
        expect(result.token).toMatch(/^[a-f\d]{64}$/);
        expect(createAuditLog).toHaveBeenCalledOnce();
    });

    it('traduit la course sur l’index pending email en conflit métier', async () => {
        setup();
        CommercialInvitation.create.mockRejectedValue({
            code: 11000,
            keyPattern: { emailCanonical: 1 },
        });

        await expect(createCommercialInvitation({
            email: 'beta@example.com',
            planId: 'plan-id',
            workspaceName: 'Beta Workspace',
            billingInterval: BILLING_INTERVAL.NONE,
            reason: 'Programme beta septembre',
            actorId: 'actor-id',
        })).rejects.toMatchObject({ statusCode: 409 });
    });
});
