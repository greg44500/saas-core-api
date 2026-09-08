import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    assertCommercialInvitationBeneficiaryAvailable,
} from '../../modules/commercialInvitation/commercialInvitation.service.js';
import { User } from '../../modules/users/user.model.js';
import { WorkspaceMember } from '../../modules/workspaceMember/workspaceMember.model.js';

vi.mock('mongoose', () => ({
    default: {
        trusted: (value) => value,
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

const selectedSessionResult = (value) => ({
    select() {
        return this;
    },
    session: vi.fn().mockResolvedValue(value),
});

const sessionResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});


describe('assertCommercialInvitationBeneficiaryAvailable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('accepte une adresse qui ne possède pas encore de compte', async () => {
        User.findOne.mockReturnValue(selectedSessionResult(null));

        await expect(
            assertCommercialInvitationBeneficiaryAvailable({
                emailCanonical: 'beta@example.com',
                session: { id: 'session' },
            }),
        ).resolves.toBeUndefined();

        expect(WorkspaceMember.exists).not.toHaveBeenCalled();
    });

    it('accepte un compte Auth existant sans membership Workspace courant', async () => {
        User.findOne.mockReturnValue(selectedSessionResult({
            _id: 'user-id',
        }));
        WorkspaceMember.exists.mockReturnValue(sessionResult(null));

        await expect(
            assertCommercialInvitationBeneficiaryAvailable({
                emailCanonical: 'beta@example.com',
                session: { id: 'session' },
            }),
        ).resolves.toBeUndefined();
    });

    it('refuse un compte déjà rattaché à un workspace', async () => {
        User.findOne.mockReturnValue(selectedSessionResult({
            _id: 'user-id',
        }));
        WorkspaceMember.exists.mockReturnValue(sessionResult({
            _id: 'membership-id',
        }));

        await expect(
            assertCommercialInvitationBeneficiaryAvailable({
                emailCanonical: 'beta@example.com',
                session: { id: 'session' },
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });
});
