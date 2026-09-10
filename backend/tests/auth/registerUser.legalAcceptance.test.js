import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    LEGAL_ACCEPTANCE_SOURCE,
} from '../../constants/legalDocuments.constants.js';
import { AuthIdentity } from '../../modules/authIdentities/authIdentity.model.js';
import {
    registerUser,
} from '../../modules/auth/services/registerUser.service.js';
import {
    createRegistrationLegalAcceptance,
} from '../../modules/legalAcceptance/legalAcceptance.service.js';
import { User } from '../../modules/users/user.model.js';
import { hashPassword } from '../../utils/password.js';

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        exists: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        create: vi.fn(),
    },
}));

vi.mock('../../utils/password.js', () => ({
    hashPassword: vi.fn(),
}));

vi.mock('../../modules/legalAcceptance/legalAcceptance.service.js', () => ({
    createRegistrationLegalAcceptance: vi.fn(),
}));

describe('registerUser legal acceptance', () => {
    const session = {};
    const user = {
        _id: 'user-id',
        firstName: 'Greg',
        lastName: 'Ballat',
        email: 'greg@example.com',
        emailCanonical: 'greg@example.com',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        User.exists.mockResolvedValue(null);
        User.create.mockResolvedValue([user]);
        AuthIdentity.create.mockResolvedValue([{}]);
        hashPassword.mockResolvedValue('hashed-password');
        createRegistrationLegalAcceptance.mockResolvedValue({});

        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('enregistre dans la transaction la preuve versionnée d’une inscription publique', async () => {
        await registerUser({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'Une phrase de passe longue et unique 47!',
            legalAccepted: true,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest Browser',
        });

        expect(createRegistrationLegalAcceptance).toHaveBeenCalledWith({
            userId: 'user-id',
            source: LEGAL_ACCEPTANCE_SOURCE.LOCAL_REGISTRATION,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest Browser',
            session,
        });
    });

    it('conserve une source distincte pour le parcours invitation commerciale', async () => {
        await registerUser({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'Une phrase de passe longue et unique 47!',
            legalAccepted: true,
            legalAcceptanceSource:
                LEGAL_ACCEPTANCE_SOURCE.COMMERCIAL_INVITATION_REGISTRATION,
        });

        expect(createRegistrationLegalAcceptance).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-id',
                source:
                    LEGAL_ACCEPTANCE_SOURCE.COMMERCIAL_INVITATION_REGISTRATION,
                session,
            }),
        );
    });

    it('refuse explicitement legalAccepted=false avant toute création', async () => {
        await expect(registerUser({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'Une phrase de passe longue et unique 47!',
            legalAccepted: false,
        })).rejects.toMatchObject({
            statusCode: 400,
            message: 'L’acceptation des conditions est requise pour créer un compte',
        });

        expect(User.exists).not.toHaveBeenCalled();
        expect(createRegistrationLegalAcceptance).not.toHaveBeenCalled();
    });

    it('ne fabrique pas une acceptation pour un appel interne sans marqueur public', async () => {
        await registerUser({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'Une phrase de passe longue et unique 47!',
        });

        expect(createRegistrationLegalAcceptance).not.toHaveBeenCalled();
    });
});
