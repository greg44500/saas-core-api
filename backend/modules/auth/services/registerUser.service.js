import mongoose from 'mongoose';

import {
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import {
    LEGAL_ACCEPTANCE_SOURCE,
} from '../../../constants/legalDocuments.constants.js';
import { AppError } from '../../../utils/appError.js';
import {
    canonicalizeEmail,
} from '../../../utils/canonicalizeEmail.js';
import {
    hashPassword,
} from '../../../utils/password.js';
import {
    AuthIdentity,
} from '../../authIdentities/authIdentity.model.js';
import {
    createRegistrationLegalAcceptance,
} from '../../legalAcceptance/legalAcceptance.service.js';
import { User } from '../../users/user.model.js';

const EMAIL_ALREADY_USED_MESSAGE =
    'Un compte existe déjà avec cette adresse email';

const LEGAL_ACCEPTANCE_REQUIRED_MESSAGE =
    'L’acceptation des conditions est requise pour créer un compte';

/**
 * Crée transactionnellement le User et son identité locale.
 *
 * Les routes publiques register imposent `legalAccepted: true` par leur contrat
 * Zod backend. Lorsque ce marqueur est fourni, la preuve versionnée est créée
 * dans la même transaction. Son absence reste réservée aux appels internes de
 * provisioning qui ne représentent pas une acceptation contractuelle publique.
 */
const registerUser = async ({
    firstName,
    lastName,
    email,
    password,
    legalAccepted,
    legalAcceptanceSource = LEGAL_ACCEPTANCE_SOURCE.LOCAL_REGISTRATION,
    ipAddress = null,
    userAgent = null,
}) => {
    if (legalAccepted === false) {
        throw new AppError(
            LEGAL_ACCEPTANCE_REQUIRED_MESSAGE,
            400,
        );
    }

    const shouldRecordLegalAcceptance =
        legalAccepted === true;

    const emailCanonical = canonicalizeEmail(email);

    const existingUser = await User.exists({
        emailCanonical,
    });

    if (existingUser) {
        throw new AppError(
            EMAIL_ALREADY_USED_MESSAGE,
            409,
        );
    }

    const passwordHash = await hashPassword(
        password,
    );

    let createdUser;

    try {
        await mongoose.connection.transaction(
            async (session) => {
                const [user] = await User.create(
                    [
                        {
                            firstName,
                            lastName,
                            email,
                            emailCanonical,
                        },
                    ],
                    { session },
                );

                await AuthIdentity.create(
                    [
                        {
                            user: user._id,
                            provider: AUTH_PROVIDER.LOCAL,
                            passwordHash,
                        },
                    ],
                    { session },
                );

                if (shouldRecordLegalAcceptance) {
                    await createRegistrationLegalAcceptance({
                        userId: user._id,
                        source: legalAcceptanceSource,
                        ipAddress,
                        userAgent,
                        session,
                    });
                }

                createdUser = user;
            },
        );
    } catch (error) {
        if (
            error?.code === 11000 &&
            (
                error?.keyPattern?.emailCanonical ||
                error?.keyValue?.emailCanonical
            )
        ) {
            throw new AppError(
                EMAIL_ALREADY_USED_MESSAGE,
                409,
            );
        }

        throw error;
    }

    return createdUser;
};

export {
    EMAIL_ALREADY_USED_MESSAGE,
    LEGAL_ACCEPTANCE_REQUIRED_MESSAGE,
    registerUser,
};
