import mongoose from 'mongoose';

import {
    loginUser,
} from './services/loginUser.service.js';
import {
    changeUserPassword,
} from './services/changeUserPassword.service.js';
import {
    resetUserPassword,
} from './services/resetUserPassword.service.js';
import {
    forgotUserPassword,
} from './services/forgotUserPassword.service.js';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AppError } from '../../utils/AppError.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { hashPassword } from '../../utils/password.js';
import { AuthIdentity } from '../authIdentities/authIdentity.model.js';
import { User } from '../users/user.model.js';

/*
 * Messages internes du module Auth.
 */
const EMAIL_ALREADY_USED_MESSAGE =
    'Un compte existe déjà avec cette adresse email';

/**
 * Crée un compte utilisateur utilisant l'authentification locale.
 *
 * User et AuthIdentity sont créés dans une même transaction afin
 * d'éviter qu'un compte partiellement initialisé reste en base.
 *
 * @param {object} input Données préalablement validées par registerSchema.
 * @param {string} input.firstName
 * @param {string} input.lastName
 * @param {string} input.email
 * @param {string} input.password
 * @returns {Promise<import('mongoose').Document>} User nouvellement créé.
 */
const registerUser = async ({
    firstName,
    lastName,
    email,
    password,
}) => {
    const emailCanonical = canonicalizeEmail(email);

    // Cette vérification permet de produire une erreur métier claire.
    // L'index unique MongoDB reste le véritable dernier garde-fou.
    const existingUser = await User.exists({ emailCanonical });

    if (existingUser) {
        throw new AppError(EMAIL_ALREADY_USED_MESSAGE, 409);
    }

    // Le calcul Argon2id est effectué avant d'ouvrir la transaction
    // afin de garder la transaction MongoDB aussi courte que possible.
    const passwordHash = await hashPassword(password);

    let createdUser;

    try {
        await mongoose.connection.transaction(async (session) => {
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

            createdUser = user;
        });
    } catch (error) {
        // Deux inscriptions simultanées peuvent toutes deux réussir
        // la vérification préalable. L'index unique protège ce cas réel.
        if (
            error?.code === 11000 &&
            (error?.keyPattern?.emailCanonical ||
                error?.keyValue?.emailCanonical)
        ) {
            throw new AppError(EMAIL_ALREADY_USED_MESSAGE, 409);
        }

        throw error;
    }

    return createdUser;
};



export {
    changeUserPassword,
    forgotUserPassword,
    registerUser,
    loginUser,
    resetUserPassword,
};