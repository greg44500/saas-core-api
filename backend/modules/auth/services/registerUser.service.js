import mongoose from 'mongoose';

import {
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import { AppError } from '../../../utils/AppError.js';
import {
    canonicalizeEmail,
} from '../../../utils/canonicalizeEmail.js';
import {
    hashPassword,
} from '../../../utils/password.js';
import {
    AuthIdentity,
} from '../../authIdentities/authIdentity.model.js';
import { User } from '../../users/user.model.js';

const EMAIL_ALREADY_USED_MESSAGE =
    'Un compte existe déjà avec cette adresse email';

/**
 * Crée un compte utilisateur utilisant l'authentification locale.
 *
 * User et AuthIdentity sont créés dans une même transaction afin
 * d'éviter qu'un compte partiellement initialisé reste en base.
 *
 * Le hash du mot de passe est calculé avant l'ouverture de la
 * transaction afin de ne pas prolonger celle-ci avec un calcul
 * Argon2id volontairement coûteux.
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

    /*
     * Cette vérification préalable produit une erreur métier claire.
     * L'index unique MongoDB reste néanmoins le dernier garde-fou
     * contre les inscriptions concurrentes.
     */
    const existingUser = await User.exists({
        emailCanonical,
    });

    if (existingUser) {
        throw new AppError(
            EMAIL_ALREADY_USED_MESSAGE,
            409,
        );
    }

    /*
     * Le calcul Argon2id est effectué avant la transaction afin
     * de conserver celle-ci aussi courte que possible.
     */
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
                    {
                        session,
                    },
                );

                await AuthIdentity.create(
                    [
                        {
                            user: user._id,
                            provider:
                                AUTH_PROVIDER.LOCAL,
                            passwordHash,
                        },
                    ],
                    {
                        session,
                    },
                );

                createdUser = user;
            },
        );
    } catch (error) {
        /*
         * Deux inscriptions simultanées peuvent réussir la vérification
         * préalable. L'index unique protège ce cas au niveau de MongoDB.
         */
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
    registerUser,
};