import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_TERM_TYPE,
} from '../../constants/subscription.constants.js';
import {
    COMMERCIAL_INVITATION_STATUS,
} from '../../constants/commercialInvitation.constants.js';
import {
    USER_STATUS,
} from '../../constants/userStatus.constants.js';
import {
    acceptCommercialInvitation,
} from '../../modules/commercialInvitation/acceptCommercialInvitation.service.js';
import { CommercialInvitation } from '../../modules/commercialInvitation/commercialInvitation.model.js';
import {
    assertCommercialInvitationOfferIsCurrent,
    hashCommercialInvitationToken,
} from '../../modules/commercialInvitation/commercialInvitation.service.js';
import { Plan } from '../../modules/plan/plan.model.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    hasConsumedTrial,
    recordTrialConsumption,
} from '../../modules/trialEligibility/trialEligibility.service.js';
import { User } from '../../modules/users/user.model.js';
import { WorkspaceMember } from '../../modules/workspaceMember/workspaceMember.model.js';
import {
    createWorkspaceInSession,
} from '../../modules/workspace/workspace.service.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';

vi.mock('mongoose', () => ({
    default: {
        connection: { transaction: vi.fn() },
        trusted: (value) => value,
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));
vi.mock('../../modules/commercialInvitation/commercialInvitation.model.js', () => ({
    CommercialInvitation: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));
vi.mock('../../modules/commercialInvitation/commercialInvitation.service.js', () => ({
    assertCommercialInvitationOfferIsCurrent: vi.fn(),
    hashCommercialInvitationToken: vi.fn(() => 'digest'),
}));
vi.mock('../../modules/plan/plan.model.js', () => ({
    Plan: { findById: vi.fn() },
}));
vi.mock('../../modules/subscriptions/subscription.model.js', () => ({
    Subscription: { create: vi.fn() },
}));
vi.mock('../../modules/trialEligibility/trialEligibility.service.js', () => ({
    hasConsumedTrial: vi.fn(),
    recordTrialConsumption: vi.fn(),
}));
vi.mock('../../modules/users/user.model.js', () => ({
    User: { findById: vi.fn() },
}));
vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: { exists: vi.fn() },
}));
vi.mock('../../modules/workspace/workspace.service.js', () => ({
    createWorkspaceInSession: vi.fn(),
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

const buildInvitation = ({ trialEnabled = false } = {}) => ({
    _id: 'invitation-id',
    emailCanonical: 'beta@example.com',
    invitedBy: 'platform-actor-id',
    plan: 'plan-id',
    workspaceName: 'Beta Workspace',
    status: COMMERCIAL_INVITATION_STATUS.PENDING,
    offerSnapshot: {
        planName: 'Découverte',
        currency: 'EUR',
        billingInterval: trialEnabled
            ? BILLING_INTERVAL.MONTHLY
            : BILLING_INTERVAL.NONE,
        priceExclTaxMinor: trialEnabled ? 7900 : 0,
        trialEnabled,
        trialDurationDays: trialEnabled ? 14 : null,
        features: ['file_upload'],
        limits: new Map([['members', 3]]),
    },
});

const setup = ({
    trialEnabled = false,
    userEmail = 'beta@example.com',
    userStatus = USER_STATUS.ACTIVE,
    existingMembership = null,
    consumedTrial = false,
    acceptedUpdate = true,
} = {}) => {
    const session = { id: 'mongo-session' };
    const user = {
        _id: 'user-id',
        emailCanonical: userEmail,
        status: userStatus,
    };
    const invitation = buildInvitation({ trialEnabled });
    const plan = {
        _id: 'plan-id',
        name: 'Découverte',
    };
    const workspace = {
        _id: 'workspace-id',
        name: 'Beta Workspace',
        status: 'active',
    };
    const subscription = {
        _id: 'subscription-id',
        workspace: workspace._id,
        plan: plan._id,
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        termType: trialEnabled
            ? SUBSCRIPTION_TERM_TYPE.FIXED
            : SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
        status: trialEnabled
            ? SUBSCRIPTION_STATUS.TRIALING
            : SUBSCRIPTION_STATUS.ACTIVE,
        trialEndsAt: trialEnabled
            ? new Date('2026-09-22T12:00:00.000Z')
            : null,
        currentPeriodEnd: trialEnabled
            ? new Date('2026-09-22T12:00:00.000Z')
            : null,
        billingInterval: trialEnabled
            ? BILLING_INTERVAL.MONTHLY
            : BILLING_INTERVAL.NONE,
        priceExclTaxMinor: trialEnabled ? 7900 : 0,
        provider: BILLING_PROVIDER.MANUAL,
    };
    const acceptedInvitation = {
        ...invitation,
        status: COMMERCIAL_INVITATION_STATUS.ACCEPTED,
        acceptedAt: new Date('2026-09-08T12:00:00.000Z'),
    };

    mongoose.connection.transaction.mockImplementation(
        async (callback) => callback(session),
    );
    User.findById.mockReturnValue(selectedSessionResult(user));
    CommercialInvitation.findOne.mockReturnValue(sessionResult(invitation));
    WorkspaceMember.exists.mockReturnValue(
        sessionResult(existingMembership),
    );
    Plan.findById.mockReturnValue(sessionResult(plan));
    assertCommercialInvitationOfferIsCurrent.mockReturnValue(undefined);
    createWorkspaceInSession.mockResolvedValue(workspace);
    hasConsumedTrial.mockResolvedValue(consumedTrial);
    Subscription.create.mockResolvedValue([subscription]);
    recordTrialConsumption.mockResolvedValue(undefined);
    CommercialInvitation.findOneAndUpdate.mockResolvedValue(
        acceptedUpdate ? acceptedInvitation : null,
    );
    createAuditLog.mockResolvedValue(undefined);

    return {
        acceptedInvitation,
        invitation,
        plan,
        session,
        subscription,
        user,
        workspace,
    };
};

describe('acceptCommercialInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hashCommercialInvitationToken.mockReturnValue('digest');
    });

    it('crée une offre gratuite open-ended sans consommer TrialEligibility', async () => {
        const { session, workspace } = setup();

        const result = await acceptCommercialInvitation({
            token: 'a'.repeat(64),
            userId: 'user-id',
            now: new Date('2026-09-08T12:00:00.000Z'),
        });

        expect(createWorkspaceInSession).toHaveBeenCalledWith({
            name: 'Beta Workspace',
            actorId: 'user-id',
            session,
            ipAddress: null,
            userAgent: null,
        });
        expect(Subscription.create).toHaveBeenCalledWith(
            [expect.objectContaining({
                workspace: workspace._id,
                plan: 'plan-id',
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                currentPeriodEnd: null,
                trialEndsAt: null,
                billingInterval: BILLING_INTERVAL.NONE,
                priceExclTaxMinor: 0,
                provider: BILLING_PROVIDER.MANUAL,
            })],
            { session },
        );
        expect(hasConsumedTrial).not.toHaveBeenCalled();
        expect(recordTrialConsumption).not.toHaveBeenCalled();
        expect(result.workspace).toBe(workspace);
    });

    it('consomme TrialEligibility dans la même transaction pour un vrai trial', async () => {
        const { session, workspace } = setup({ trialEnabled: true });

        await acceptCommercialInvitation({
            token: 'a'.repeat(64),
            userId: 'user-id',
            now: new Date('2026-09-08T12:00:00.000Z'),
        });

        expect(hasConsumedTrial).toHaveBeenCalledWith({
            emailCanonical: 'beta@example.com',
            session,
        });
        expect(Subscription.create).toHaveBeenCalledWith(
            [expect.objectContaining({
                termType: SUBSCRIPTION_TERM_TYPE.FIXED,
                status: SUBSCRIPTION_STATUS.TRIALING,
                currentPeriodEnd: new Date('2026-09-22T12:00:00.000Z'),
                trialEndsAt: new Date('2026-09-22T12:00:00.000Z'),
                billingInterval: BILLING_INTERVAL.MONTHLY,
                priceExclTaxMinor: 7900,
            })],
            { session },
        );
        expect(recordTrialConsumption).toHaveBeenCalledWith({
            emailCanonical: 'beta@example.com',
            userId: 'user-id',
            workspaceId: workspace._id,
            subscriptionId: 'subscription-id',
            session,
        });
    });

    it('refuse un compte authentifié dont l’email ne correspond pas', async () => {
        setup({ userEmail: 'other@example.com' });

        await expect(acceptCommercialInvitation({
            token: 'a'.repeat(64),
            userId: 'user-id',
        })).rejects.toMatchObject({ statusCode: 403 });

        expect(createWorkspaceInSession).not.toHaveBeenCalled();
        expect(Subscription.create).not.toHaveBeenCalled();
    });

    it('revalide le statut User dans la transaction', async () => {
        setup({ userStatus: USER_STATUS.DISABLED });

        await expect(acceptCommercialInvitation({
            token: 'a'.repeat(64),
            userId: 'user-id',
        })).rejects.toMatchObject({ statusCode: 403 });

        expect(CommercialInvitation.findOne).not.toHaveBeenCalled();
        expect(createWorkspaceInSession).not.toHaveBeenCalled();
    });

    it('refuse un utilisateur déjà rattaché à un workspace', async () => {
        setup({ existingMembership: { _id: 'membership-id' } });

        await expect(acceptCommercialInvitation({
            token: 'a'.repeat(64),
            userId: 'user-id',
        })).rejects.toMatchObject({ statusCode: 409 });

        expect(createWorkspaceInSession).not.toHaveBeenCalled();
    });

    it('refuse un second trial avant de créer le workspace', async () => {
        setup({
            trialEnabled: true,
            consumedTrial: true,
        });

        await expect(acceptCommercialInvitation({
            token: 'a'.repeat(64),
            userId: 'user-id',
        })).rejects.toMatchObject({ statusCode: 409 });

        expect(createWorkspaceInSession).not.toHaveBeenCalled();
        expect(Subscription.create).not.toHaveBeenCalled();
        expect(CommercialInvitation.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('échoue fermé si l’acceptation conditionnelle perd une course', async () => {
        setup({ acceptedUpdate: false });

        await expect(acceptCommercialInvitation({
            token: 'a'.repeat(64),
            userId: 'user-id',
        })).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse un instant système invalide avant toute transaction', async () => {
        setup();

        await expect(acceptCommercialInvitation({
            token: 'a'.repeat(64),
            userId: 'user-id',
            now: new Date('invalid'),
        })).rejects.toThrow('now must be a valid Date');

        expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    });
});
