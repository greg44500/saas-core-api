import mongoose from 'mongoose';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AppError } from '../../utils/AppError.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { AuthIdentity } from '../authIdentities/authIdentity.model.js';
import { User } from '../users/user.model.js';

const EMAIL_ALREADY_USED_MESSAGE =
    'Un compte existe déjà avec cette adresse email';

const INVALID_CREDENTIALS_MESSAGE = 'Identifiants invalides';

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

/**
 * Authentifie un utilisateur avec son identité locale.
 *
 * Le même message d'erreur est utilisé lorsque l'email, l'identité
 * locale ou le mot de passe est incorrect afin de ne pas révéler
 * inutilement l'existence d'un compte.
 *
 * @param {object} input Données préalablement validées par loginSchema.
 * @param {string} input.email
 * @param {string} input.password
 * @returns {Promise<import('mongoose').Document>} User authentifié.
 */
const loginUser = async ({ email, password }) => {
    const emailCanonical = canonicalizeEmail(email);

    const user = await User.findOne({ emailCanonical });

    if (!user) {
        throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
    }

    // passwordHash est select:false dans le modèle.
    // Le login est l'un des rares endroits autorisés à le récupérer.
    const authIdentity = await AuthIdentity.findOne({
        user: user._id,
        provider: AUTH_PROVIDER.LOCAL,
    }).select('+passwordHash');

    if (!authIdentity) {
        throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
    }

    const passwordIsValid = await verifyPassword(
        password,
        authIdentity.passwordHash,
    );

    if (!passwordIsValid) {
        throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
    }

    // On contrôle l'état du compte seulement après avoir validé
    // les credentials afin de ne pas exposer son existence.
    if (user.status === 'disabled') {
        throw new AppError('Compte désactivé', 403);
    }

    if (user.status === 'closed') {
        throw new AppError('Compte clôturé', 403);
    }

    user.lastLoginAt = new Date();

    await user.save();

    return user;
};

export {
    registerUser,
    loginUser
};