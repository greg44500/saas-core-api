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
} from '../../constants/auditActions.constants.js';
import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';
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
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';
import {
    acceptWorkspaceInvitation,
} from '../../modules/workspaceInvitation/acceptWorkspaceInvitation.service.js';
import {
    WorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitation.model.js';

vi.mock('mongoose', () => ({
    default: {
        connection: { transaction: vi.fn() },
        trusted: (value) => value,
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
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
    User: { findById: vi.fn() },
}));
vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        findOne: vi.fn(),
        create: vi.fn(),
    },
}));
vi.mock('../../modules/workspaceInvitation/workspaceInvitation.model.js', () => ({
    WorkspaceInvitation: { findOne: vi.fn() },
}));

const chainedResult = (value) => ({
    select() { return this; },
    session: vi.fn().mockResolvedValue(value),
});

function prepareAcceptance({ existingMembership = null } = {}) {
    const session = { id: 'session' };
    const now = new Date('2026-08-30T08:00:00.000Z');
    const actor = {
        _id: 'actor-id',
        emailCanonical: 'member@example.com',
    };
    const role = {
        _id: 'role-id',
        key: 'member',
        isSystem: true,
    };
    const invitation = {
        _id: 'invitation-id',
        workspace: 'workspace-id',
        role: 'role-id',
        emailCanonical: 'member@example.com',
        status: WORKSPACE_INVITATION_STATUS.PENDING,
        save: vi.fn().mockResolvedValue(undefined),
    };
    const entitlement = {
        effectiveCapabilities: {
            features: [CORE_PLAN_FEATURE.TEAM_MANAGEMENT],
            limits: {},
            appliedOverrides: [],
        },
    };

    mongoose.connection.transaction.mockImplementation(
        async (callback) => callback(session),
    );
    User.findById.mockReturnValue(chainedResult(actor));
    WorkspaceInvitation.findOne.mockReturnValue(chainedResult(invitation));
    getWorkspaceEffectiveEntitlement.mockResolvedValue(entitlement);
    assertEntitlementFeatureAvailable.mockReturnValue(true);
    Role.findOne.mockReturnValue(chainedResult(role));
    WorkspaceMember.findOne.mockReturnValue(
        chainedResult(existingMembership),
    );
    enforcePlanLimit.mockResolvedValue({
        usageMetric: { value: 2 },
    });
    createAuditLog.mockResolvedValue(undefined);

    return { session, now, invitation, entitlement };
}

describe('acceptWorkspaceInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('vérifie team_management puis crée le membership dans la transaction', async () => {
        const { session, now, invitation, entitlement } = prepareAcceptance();
        const membership = { _id: 'membership-id' };
        WorkspaceMember.create.mockResolvedValue([membership]);

        const result = await acceptWorkspaceInvitation({
            token: 'raw-token',
            actorId: 'actor-id',
            now,
        });

        expect(getWorkspaceEffectiveEntitlement).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            at: now,
            session,
        });
        expect(assertEntitlementFeatureAvailable).toHaveBeenCalledWith({
            entitlement,
            featureKey: CORE_PLAN_FEATURE.TEAM_MANAGEMENT,
        });
        expect(enforcePlanLimit).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            metricKey: CORE_PLAN_METRIC.MEMBERS,
            amount: 1,
            actorId: 'actor-id',
            at: now,
            session,
        });
        expect(WorkspaceMember.create).toHaveBeenCalledOnce();
        expect(invitation.status).toBe(
            WORKSPACE_INVITATION_STATUS.ACCEPTED,
        );
        expect(invitation.acceptedBy).toBe('actor-id');
        expect(invitation.acceptedAt).toBe(now);
        expect(invitation.save).toHaveBeenCalledWith({ session });
        expect(result.membership).toBe(membership);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.MEMBER_INVITATION_ACCEPTED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                status: AUDIT_STATUS.SUCCESS,
            }),
            { session },
        );
    });

    it('refuse une invitation devenue commercialement indisponible avant acceptation', async () => {
        prepareAcceptance();
        const featureError = Object.assign(
            new Error('feature unavailable'),
            { statusCode: 403 },
        );
        assertEntitlementFeatureAvailable.mockImplementation(() => {
            throw featureError;
        });

        await expect(
            acceptWorkspaceInvitation({
                token: 'raw-token',
                actorId: 'actor-id',
            }),
        ).rejects.toBe(featureError);

        expect(enforcePlanLimit).not.toHaveBeenCalled();
        expect(WorkspaceMember.create).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('réactive le même membership lorsqu’il avait été removed', async () => {
        const removedMembership = {
            _id: 'membership-id',
            status: WORKSPACE_MEMBER_STATUS.REMOVED,
            role: 'old-role-id',
            updatedBy: 'old-actor-id',
            save: vi.fn().mockResolvedValue(undefined),
        };
        const { now } = prepareAcceptance({
            existingMembership: removedMembership,
        });

        await acceptWorkspaceInvitation({
            token: 'raw-token',
            actorId: 'actor-id',
            now,
        });

        expect(removedMembership.status).toBe(
            WORKSPACE_MEMBER_STATUS.ACTIVE,
        );
        expect(removedMembership.role).toBe('role-id');
        expect(removedMembership.updatedBy).toBe('actor-id');
        expect(WorkspaceMember.create).not.toHaveBeenCalled();
    });

    it('refuse l’acceptation lorsque l’email du compte ne correspond pas', async () => {
        prepareAcceptance();
        User.findById.mockReturnValue(chainedResult({
            _id: 'actor-id',
            emailCanonical: 'other@example.com',
        }));

        await expect(
            acceptWorkspaceInvitation({
                token: 'raw-token',
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(getWorkspaceEffectiveEntitlement).not.toHaveBeenCalled();
        expect(enforcePlanLimit).not.toHaveBeenCalled();
    });

    it('propage le refus du quota sans créer de membership', async () => {
        prepareAcceptance();
        const quotaError = new Error('member limit reached');
        enforcePlanLimit.mockRejectedValue(quotaError);

        await expect(
            acceptWorkspaceInvitation({
                token: 'raw-token',
                actorId: 'actor-id',
            }),
        ).rejects.toBe(quotaError);

        expect(WorkspaceMember.create).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
