import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    LEGAL_ACCEPTANCE_SOURCE,
} from '../../constants/legalDocuments.constants.js';
import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_METRIC,
} from '../../modules/plan/planCapability.registry.js';
import {
    assertEntitlementFeatureAvailable,
} from '../../modules/plan/planFeature.service.js';
import {
    enforcePlanLimit,
} from '../../modules/plan/planLimit.service.js';
import { Role } from '../../modules/role/role.model.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../../modules/subscriptions/subscription.service.js';
import { User } from '../../modules/users/user.model.js';
import { AuthIdentity } from '../../modules/authIdentities/authIdentity.model.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import {
    createRegistrationLegalAcceptance,
} from '../../modules/legalAcceptance/legalAcceptance.service.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';
import {
    acceptNewWorkspaceInvitation,
} from '../../modules/workspaceInvitation/acceptWorkspaceInvitation.service.js';
import {
    WorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitation.model.js';
import { hashPassword } from '../../utils/password.js';

vi.mock('mongoose', () => ({
    default: {
        connection: { transaction: vi.fn() },
        trusted: (value) => value,
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));
vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: { create: vi.fn() },
}));
vi.mock('../../modules/legalAcceptance/legalAcceptance.service.js', () => ({
    createRegistrationLegalAcceptance: vi.fn(),
}));
vi.mock('../../modules/plan/planFeature.service.js', () => ({
    assertEntitlementFeatureAvailable: vi.fn(),
}));
vi.mock('../../modules/plan/planLimit.service.js', () => ({
    enforcePlanLimit: vi.fn(),
}));
vi.mock('../../modules/role/role.model.js', () => ({
    Role: { findOne: vi.fn() },
}));
vi.mock('../../modules/subscriptions/subscription.service.js', () => ({
    getWorkspaceEffectiveEntitlement: vi.fn(),
}));
vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findById: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
    },
}));
vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        findOne: vi.fn(),
        create: vi.fn(),
    },
}));
vi.mock('../../modules/workspaceInvitation/workspaceInvitation.model.js', () => ({
    WorkspaceInvitation: {
        exists: vi.fn(),
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));
vi.mock('../../utils/password.js', () => ({
    hashPassword: vi.fn(),
}));

const chainedResult = (value) => ({
    select() { return this; },
    session: vi.fn().mockResolvedValue(value),
});

const sessionResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const setup = ({ existingUser = null } = {}) => {
    const session = { id: 'session' };
    const invitation = {
        _id: 'invitation-id',
        workspace: 'workspace-id',
        role: 'role-id',
        invitedBy: 'inviter-id',
        emailCanonical: 'new.member@example.com',
        status: WORKSPACE_INVITATION_STATUS.PENDING,
    };
    const role = {
        _id: 'role-id',
        key: 'member',
        isSystem: true,
    };
    const entitlement = {
        effectiveCapabilities: {
            features: [CORE_PLAN_FEATURE.TEAM_MANAGEMENT],
            limits: {},
            appliedOverrides: [],
        },
    };
    const user = {
        _id: 'new-user-id',
        firstName: 'Marie',
        lastName: 'Martin',
        email: invitation.emailCanonical,
    };
    const membership = {
        _id: 'membership-id',
        role: role._id,
        status: 'active',
    };
    const acceptedInvitation = {
        ...invitation,
        status: WORKSPACE_INVITATION_STATUS.ACCEPTED,
        acceptedBy: user._id,
    };

    WorkspaceInvitation.exists.mockResolvedValue({ _id: invitation._id });
    mongoose.connection.transaction.mockImplementation(
        async (callback) => callback(session),
    );
    WorkspaceInvitation.findOne.mockReturnValue(sessionResult(invitation));
    WorkspaceInvitation.findOneAndUpdate.mockResolvedValue(acceptedInvitation);
    User.findOne.mockReturnValue(chainedResult(existingUser));
    User.create.mockResolvedValue([user]);
    AuthIdentity.create.mockResolvedValue([{}]);
    getWorkspaceEffectiveEntitlement.mockResolvedValue(entitlement);
    assertEntitlementFeatureAvailable.mockReturnValue(true);
    Role.findOne.mockReturnValue(sessionResult(role));
    WorkspaceMember.findOne.mockReturnValue(sessionResult(null));
    WorkspaceMember.create.mockResolvedValue([membership]);
    enforcePlanLimit.mockResolvedValue({ usageMetric: { value: 1 } });
    createRegistrationLegalAcceptance.mockResolvedValue({});
    createAuditLog.mockResolvedValue(undefined);
    hashPassword.mockResolvedValue('password-hash');

    return {
        acceptedInvitation,
        entitlement,
        invitation,
        membership,
        role,
        session,
        user,
    };
};

describe('acceptNewWorkspaceInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('refuse de créer un second User lorsque l’adresse invitée existe déjà', async () => {
        setup({ existingUser: { _id: 'existing-user-id' } });

        await expect(
            acceptNewWorkspaceInvitation({
                token: 'a'.repeat(64),
                firstName: 'Marie',
                lastName: 'Martin',
                password: 'Phrase unique pour workspace 47!',
                legalAccepted: true,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(User.create).not.toHaveBeenCalled();
        expect(AuthIdentity.create).not.toHaveBeenCalled();
        expect(WorkspaceMember.create).not.toHaveBeenCalled();
        expect(createRegistrationLegalAcceptance).not.toHaveBeenCalled();
        expect(WorkspaceInvitation.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('crée le compte, la preuve légale, le membership et consomme l’invitation dans la même transaction', async () => {
        const {
            acceptedInvitation,
            entitlement,
            invitation,
            membership,
            session,
            user,
        } = setup();
        const now = new Date('2026-09-10T19:30:00.000Z');

        const result = await acceptNewWorkspaceInvitation({
            token: 'a'.repeat(64),
            firstName: 'Marie',
            lastName: 'Martin',
            password: 'Phrase unique pour workspace 47!',
            legalAccepted: true,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
            now,
        });

        expect(hashPassword).toHaveBeenCalledOnce();
        expect(getWorkspaceEffectiveEntitlement).toHaveBeenCalledWith({
            workspaceId: invitation.workspace,
            at: now,
            session,
        });
        expect(assertEntitlementFeatureAvailable).toHaveBeenCalledWith({
            entitlement,
            featureKey: CORE_PLAN_FEATURE.TEAM_MANAGEMENT,
        });
        expect(User.create).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    firstName: 'Marie',
                    lastName: 'Martin',
                    email: invitation.emailCanonical,
                    emailCanonical: invitation.emailCanonical,
                    emailVerifiedAt: now,
                }),
            ],
            { session },
        );
        expect(AuthIdentity.create).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    user: user._id,
                    provider: 'local',
                    passwordHash: 'password-hash',
                }),
            ],
            { session },
        );
        expect(createRegistrationLegalAcceptance).toHaveBeenCalledWith({
            userId: user._id,
            source: LEGAL_ACCEPTANCE_SOURCE.WORKSPACE_INVITATION_REGISTRATION,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
            acceptedAt: now,
            session,
        });
        expect(enforcePlanLimit).toHaveBeenCalledWith({
            workspaceId: invitation.workspace,
            metricKey: CORE_PLAN_METRIC.MEMBERS,
            amount: 1,
            actorId: user._id,
            at: now,
            session,
        });
        expect(WorkspaceMember.create).toHaveBeenCalledOnce();
        expect(WorkspaceInvitation.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: invitation._id,
                tokenHash: expect.any(String),
                status: WORKSPACE_INVITATION_STATUS.PENDING,
                expiresAt: { $gt: now },
            },
            {
                $set: {
                    status: WORKSPACE_INVITATION_STATUS.ACCEPTED,
                    acceptedBy: user._id,
                    acceptedAt: now,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
        expect(createAuditLog).toHaveBeenCalledOnce();
        expect(result.invitation).toBe(acceptedInvitation);
        expect(result.user).toBe(user);
        expect(result.membership).toBe(membership);
    });

    it('échoue fermé si une acceptation concurrente consomme le lien avant la mutation finale', async () => {
        setup();
        WorkspaceInvitation.findOneAndUpdate.mockResolvedValue(null);

        await expect(
            acceptNewWorkspaceInvitation({
                token: 'a'.repeat(64),
                firstName: 'Marie',
                lastName: 'Martin',
                password: 'Phrase unique pour workspace 47!',
                legalAccepted: true,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
