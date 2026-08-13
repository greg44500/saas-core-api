import mongoose from 'mongoose';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AppError } from '../../utils/AppError.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { AuthIdentity } from '../authIdentities/authIdentity.model.js';
import { User } from '../users/user.model.js';
import { createInitialAuthSession, revokeAllUserAuthSessions } from '../authSessions/authSession.service.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';

import {
    USER_STATUS,
} from '../../constants/userStatus.constants.js';

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
/**
 * Authentifie un utilisateur avec son identité locale.
 *
 * Le même message d'erreur est utilisé lorsque l'email, l'identité
 * locale ou le mot de passe est incorrect afin de ne pas révéler
 * inutilement l'existence d'un compte.
 *
 * Une fois l'authentification validée, une nouvelle AuthSession est créée.
 * Le refresh token brut est retourné uniquement afin que le controller
 * puisse ensuite le placer dans un cookie HttpOnly.
 *
 * @param {object} input Données préalablement validées par loginSchema.
 * @param {string} input.email
 * @param {string} input.password
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<{
 *   user: import('mongoose').Document,
 *   refreshToken: string
 * }>}
 */
const loginUser = async ({
    email,
    password,
    ipAddress = null,
    userAgent = null,
}) => {
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

    // deletion_requested reste volontairement authentifiable.
    // Le blocage des écritures métier sera géré plus tard
    // par un mécanisme transversal dédié.

    // Création de la session durable associée à cette connexion.
    //
    // Le refresh token brut n'est jamais enregistré en base :
    // createInitialAuthSession() ne persiste que son hash.
    const { refreshToken } = await createInitialAuthSession({
        userId: user._id,
        ipAddress,
        userAgent,
    });

    // lastLoginAt représente le dernier login réussi.
    // AuthSession reste la source de vérité concernant les sessions actives.
    user.lastLoginAt = new Date();

    await user.save();

    return {
        user,
        refreshToken,
    };
};

/**
 * Modifie le mot de passe de l'utilisateur authentifié.
 *
 * Le hash, la date de changement et la révocation des sessions
 * sont modifiés dans une même transaction MongoDB.
 *
 * Le nouveau hash est calculé avant la transaction afin de limiter
 * sa durée et d'éviter d'y effectuer un calcul Argon2id coûteux.
 *
 * @param {object} input
 * @param {string|import('mongoose').Types.ObjectId} input.userId
 * @param {string} input.currentPassword
 * @param {string} input.newPassword
 * @returns {Promise<{passwordChangedAt: Date}>}
 */
const changeUserPassword = async ({
    userId,
    currentPassword,
    newPassword,
}) => {
    const authIdentityQuery = AuthIdentity.findOne({
        user: userId,
        provider: AUTH_PROVIDER.LOCAL,
    });

    const authIdentity =
        await authIdentityQuery.select(
            '+passwordHash',
        );

    /*
     * Le même refus est utilisé lorsque l'identité locale
     * est absente ou que le mot de passe actuel est incorrect.
     */
    if (!authIdentity) {
        throw new AppError(
            'Mot de passe actuel invalide',
            401,
        );
    }

    const currentPasswordIsValid =
        await verifyPassword(
            currentPassword,
            authIdentity.passwordHash,
        );

    if (!currentPasswordIsValid) {
        throw new AppError(
            'Mot de passe actuel invalide',
            401,
        );
    }

    /*
     * Un nouveau salt produirait un hash différent même si le mot
     * de passe brut était identique. Il faut donc comparer le nouveau
     * mot de passe avec le hash existant avant de le recalculer.
     */
    const newPasswordIsCurrentPassword =
        await verifyPassword(
            newPassword,
            authIdentity.passwordHash,
        );

    if (newPasswordIsCurrentPassword) {
        throw new AppError(
            'Le nouveau mot de passe doit être différent',
            400,
        );
    }

    const newPasswordHash =
        await hashPassword(newPassword);

    const passwordChangedAt = new Date();

    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Le hash actuel fait partie du filtre afin de détecter
             * une modification concurrente du mot de passe.
             */
            const identityUpdateResult =
                await AuthIdentity.updateOne(
                    {
                        _id: authIdentity._id,
                        passwordHash:
                            authIdentity.passwordHash,
                    },
                    {
                        $set: {
                            passwordHash:
                                newPasswordHash,
                        },
                    },
                    {
                        session,
                    },
                );

            if (
                identityUpdateResult.modifiedCount !== 1
            ) {
                throw new AppError(
                    'Le mot de passe a été modifié simultanément',
                    409,
                );
            }

            /*
             * Le compte peut être actif ou en demande de suppression :
             * les opérations nécessaires à sa sécurité restent permises.
             */
            const userUpdateResult =
                await User.updateOne(
                    {
                        _id: userId,
                        status: mongoose.trusted({
                            $in: [
                                USER_STATUS.ACTIVE,
                                USER_STATUS.DELETION_REQUESTED,
                            ],
                        }),
                    },
                    {
                        $set: {
                            passwordChangedAt,
                            updatedBy: userId,
                        },
                    },
                    {
                        session,
                    },
                );

            if (userUpdateResult.matchedCount !== 1) {
                throw new AppError(
                    'Utilisateur indisponible',
                    403,
                );
            }

            await revokeAllUserAuthSessions({
                userId,
                revokedReason:
                    AUTH_SESSION_REVOKED_REASON
                        .PASSWORD_CHANGED,
                session,
            });
        },
    );

    return {
        passwordChangedAt,
    };
};

export {
    changeUserPassword,
    registerUser,
    loginUser
};