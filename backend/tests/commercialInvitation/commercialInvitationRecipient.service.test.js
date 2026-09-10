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
    COMMERCIAL_INVITATION_STATUS,
} from '../../constants/commercialInvitation.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { registerUser } from '../../modules/auth/auth.service.js';
import { CommercialInvitation } from '../../modules/commercialInvitation/commercialInvitation.model.js';
import {
    declineCommercialInvitation,
    registerCommercialInvitationRecipient,
    verifyCommercialInvitationRecipient,
} from '../../modules/commercialInvitation/commercialInvitationRecipient.service.js';
import {
    assertCommercialInvitationOfferIsCurrent,
} from '../../modules/commercialInvitation/commercialInvitation.service.js';
import { Plan } from '../../modules/plan/plan.model.js';
import { User } from '../../modules/users/user.model.js';

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));
vi.mock('../../modules/auth/auth.service.js', () => ({
    registerUser: vi.fn(),
}));
vi.mock('../../modules/commercialInvitation/commercialInvitation.service.js', async (importOriginal) => {
    const actual = await importOriginal();

    return {
        ...actual,
        assertCommercialInvitationOfferIsCurrent: vi.fn(),
    };
});
vi.mock('../../modules/commercialInvitation/commercialInvitation.model.js', () => ({
    CommercialInvitation: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));
vi.mock('../../modules/plan/plan.model.js', () => ({
    Plan: {
        findById: vi.fn(),
    },
}));
vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findById: vi.fn(),
    },
}));

describe('commercialInvitationRecipient.service', () => {
    const token = 'a'.repeat(64);
    const userId = '507f1f77bcf86cd799439011';
    const invitationId = '507f191e810c19729de860ea';
    const session = { id: 'mongo-session' };
    const invitation = {
        _id: invitationId,
        emailCanonical: 'invitee@example.com',
        plan: '507f191e810c19729de860eb',
        status: COMMERCIAL_INVITATION_STATUS.PENDING,
    };

    const mockInvitationLookup = (value = invitation) => {
        CommercialInvitation.findOne.mockReturnValue({
            session: vi.fn().mockResolvedValue(value),
        });
    };

    const mockUserLookup = (value) => {
        User.findById.mockReturnValue({
            select: vi.fn().mockReturnValue({
                session: vi.fn().mockResolvedValue(value),
            }),
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => callback(session),
        );
        mockInvitationLookup();
        Plan.findById.mockResolvedValue({ _id: invitation.plan });
        assertCommercialInvitationOfferIsCurrent.mockReturnValue(undefined);
        registerUser.mockResolvedValue({ _id: userId });
        createAuditLog.mockResolvedValue({ _id: 'audit-id' });
    });

    it('bloque un email différent avant toute création de User', async () => {
        await expect(registerCommercialInvitationRecipient({
            token,
            firstName: 'Wrong',
            lastName: 'Account',
            email: 'other@example.com',
            password: 'A-very-long-password-123!',
        })).rejects.toMatchObject({ statusCode: 403 });

        expect(registerUser).not.toHaveBeenCalled();
        expect(Plan.findById).not.toHaveBeenCalled();
    });

    it('autorise uniquement le bénéficiaire puis délègue la création à Auth', async () => {
        await registerCommercialInvitationRecipient({
            token,
            firstName: 'Invited',
            lastName: 'Person',
            email: 'Invitee@Example.com',
            password: 'A-very-long-password-123!',
        });

        expect(assertCommercialInvitationOfferIsCurrent).toHaveBeenCalledOnce();
        expect(registerUser).toHaveBeenCalledWith({
            firstName: 'Invited',
            lastName: 'Person',
            email: 'Invitee@Example.com',
            password: 'A-very-long-password-123!',
        });
    });

    it('refuse une session authentifiée qui ne correspond pas au bénéficiaire', async () => {
        mockUserLookup({
            _id: userId,
            emailCanonical: 'other@example.com',
        });

        await expect(verifyCommercialInvitationRecipient({
            token,
            userId,
        })).rejects.toMatchObject({ statusCode: 403 });
    });

    it('passe pending vers declined atomiquement et audite le bénéficiaire', async () => {
        const user = {
            _id: userId,
            emailCanonical: invitation.emailCanonical,
        };
        const declinedAt = new Date('2026-09-10T14:00:00.000Z');
        const declinedInvitation = {
            ...invitation,
            status: COMMERCIAL_INVITATION_STATUS.DECLINED,
            declinedAt,
            declinedBy: userId,
        };

        mockUserLookup(user);
        mockInvitationLookup(invitation);
        CommercialInvitation.findOneAndUpdate.mockResolvedValue(
            declinedInvitation,
        );

        const result = await declineCommercialInvitation({
            token,
            userId,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest-agent',
            now: declinedAt,
        });

        expect(result).toBe(declinedInvitation);
        expect(CommercialInvitation.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: invitationId,
                status: COMMERCIAL_INVITATION_STATUS.PENDING,
            }),
            {
                $set: {
                    status: COMMERCIAL_INVITATION_STATUS.DECLINED,
                    declinedAt,
                    declinedBy: userId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: userId,
                action: AUDIT_ACTION.COMMERCIAL_INVITATION_DECLINED,
                entityType: AUDIT_ENTITY_TYPE.COMMERCIAL_INVITATION,
                entityId: invitationId,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
                metadata: {
                    beneficiaryEmailCanonical: invitation.emailCanonical,
                },
            },
            { session },
        );
    });
});
