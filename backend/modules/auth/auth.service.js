import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { performance } from 'node:perf_hooks';
import { sendEmail } from '../../services/email.service.js';
import {
    ensureMinimumDuration,
} from '../../utils/securityTiming.js';
import {
    createPasswordResetToken,
} from '../passwordResetTokens/passwordResetToken.service.js';

import {
    buildPasswordResetEmail,
} from '../../services/emailTemplates/passwordResetEmail.js';
import {
    PasswordResetToken,
} from '../passwordResetTokens/passwordResetToken.model.js';
import {
    buildPasswordResetUrl,
} from './passwordResetUrl.js';
import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AppError } from '../../utils/AppError.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { hashToken } from '../../utils/token.js';
import { AuthIdentity } from '../authIdentities/authIdentity.model.js';
import { User } from '../users/user.model.js';
import { createInitialAuthSession, revokeAllUserAuthSessions } from '../authSessions/authSession.service.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';

import {
    USER_STATUS,
} from '../../constants/userStatus.constants.js';

/*
 * Messages internes du module Auth.
 */
const EMAIL_ALREADY_USED_MESSAGE =
    'Un compte existe déjà avec cette adresse email';

const INVALID_CREDENTIALS_MESSAGE = 'Identifiants invalides';

const INVALID_PASSWORD_RESET_TOKEN_MESSAGE =
    'Lien de réinitialisation invalide ou expiré';

const FORGOT_PASSWORD_RESPONSE_MESSAGE =
    'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.';

/*
* Compensation temporelle du workflow forgot-password.
*
* Le but n'est PAS d'obtenir un temps d'exécution cryptographiquement
* constant, mais de réduire l'écart observable entre :
* - une adresse inconnue qui quitte rapidement le workflow ;
* - un compte valide qui réalise plusieurs accès DB puis un envoi SMTP.
*
* Ces valeurs devront être réévaluées lorsque les emails seront
* délégués à une file de tâches durable.
*/
const FORGOT_PASSWORD_MINIMUM_DURATION_MS = 700;
const FORGOT_PASSWORD_JITTER_MS = 150;

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

/**
 * Termine une demande forgot-password en appliquant systématiquement
 * la compensation temporelle avant de retourner la réponse publique.
 *
 * Centraliser cette sortie évite qu'un nouveau cas métier ajouté plus tard
 * oublie accidentellement la protection contre l'énumération temporelle.
 *
 * @param {number} startedAt Temps de départ issu de performance.now().
 * @returns {Promise<{message: string}>}
 */
const completeForgotPasswordRequest = async (
    startedAt,
) => {
    await ensureMinimumDuration({
        startedAt,
        minimumMs:
            FORGOT_PASSWORD_MINIMUM_DURATION_MS,
        jitterMs:
            FORGOT_PASSWORD_JITTER_MS,
    });

    return {
        message:
            FORGOT_PASSWORD_RESPONSE_MESSAGE,
    };
};

/**
 * Initialise une procédure de réinitialisation de mot de passe.
 *
 * Règle de sécurité principale :
 * l'appelant ne doit pas pouvoir déterminer si l'adresse email existe.
 * L'absence d'utilisateur, l'absence d'identité locale ou un compte qui
 * ne peut pas utiliser ce workflow produisent donc la même réponse métier.
 *
 * Le token brut créé par createPasswordResetToken() n'est utilisé que pour
 * construire le lien envoyé par email. Il ne doit jamais être persisté,
 * retourné dans l'API ou écrit dans les logs.
 *
 * @param {object} input
 * @param {string} input.email Adresse préalablement validée.
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 *
 * @returns {Promise<{message: string}>}
 */
const forgotUserPassword = async ({
    email,
    ipAddress = null,
    userAgent = null,
}) => {
    /*
     * Le chronomètre démarre avant le premier accès aux données.
     *
     * Tous les chemins du workflow utiliseront cette même origine
     * lorsqu'ils construiront la réponse publique.
     */
    const startedAt = performance.now();
    const emailCanonical = canonicalizeEmail(email);

    /*
     * On recherche le User par son email canonique afin de conserver
     * exactement la même stratégie d'identification que register/login.
     */
    const user = await User.findOne({
        emailCanonical,
    });

    /*
     * IMPORTANT :
     * on retourne volontairement la même réponse lorsqu'aucun utilisateur
     * n'existe. Une erreur 404 révélerait l'existence ou non d'un compte.
     */
    if (!user) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    /*
     * Un reset password n'a de sens que si l'utilisateur possède une
     * identité locale avec mot de passe.
     *
     * Exemple :
     * un compte uniquement Google ne doit pas recevoir un token permettant
     * de créer implicitement un credential local sans workflow explicite.
     */
    const localIdentity = await AuthIdentity.exists({
        user: user._id,
        provider: AUTH_PROVIDER.LOCAL,
    });

    if (!localIdentity) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    /*
     * Les comptes clôturés ne doivent pas pouvoir réactiver indirectement
     * une capacité d'authentification par un reset password.
     *
     * On ne renvoie cependant aucune erreur spécifique afin de préserver
     * la protection contre l'énumération des comptes.
     */
    if (user.status === USER_STATUS.CLOSED) {
        return completeForgotPasswordRequest(
            startedAt,
        );
    }

    /*
     * La création du token est déléguée au service spécialisé.
     * Ce service :
     * - révoque les demandes actives précédentes ;
     * - ne persiste que le hash SHA-256 ;
     * - retourne temporairement le token brut pour construire le lien.
     */
    const { resetToken } =
        await createPasswordResetToken({
            userId: user._id,
            ipAddress,
            userAgent,
        });

    /*
     * L'origine de l'URL vient exclusivement de CLIENT_URL.
     * Aucune donnée issue du Host HTTP de la requête n'intervient ici.
     */
    const resetUrl = buildPasswordResetUrl({
        token: resetToken,
    });

    /*
     * Le template ne connaît ni User ni la configuration globale.
     * On lui transmet explicitement les données nécessaires à l'affichage.
     */
    const {
        subject,
        text,
        html,
    } = buildPasswordResetEmail({
        resetUrl,
        expiresInMinutes:
            env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
    });

    /*
     * Le transport SMTP reste derrière email.service.js.
     * Le module Auth ne dépend donc pas directement de Nodemailer.
     */
    await sendEmail({
        to: user.email,
        subject,
        text,
        html,
    });

    /*
     * Même réponse que pour une adresse inexistante ou un compte
     * sans identité locale : l'API ne révèle aucun état interne.
     */
    return completeForgotPasswordRequest(
        startedAt,
    );
};

/**
 * Réinitialise le mot de passe d'un utilisateur à partir
 * d'un token de récupération valide.
 *
 * Le token brut reçu du client n'est jamais recherché directement
 * en base : seul son hash SHA-256 est utilisé.
 *
 * Une première lecture hors transaction permet de vérifier
 * l'état courant du workflow et de calculer le nouveau hash Argon2id
 * avant d'ouvrir la transaction MongoDB.
 *
 * La transaction revalide ensuite atomiquement le token afin
 * qu'une même demande de réinitialisation ne puisse réussir
 * qu'une seule fois, même en cas de requêtes concurrentes.
 *
 * @param {object} input
 * @param {string} input.token Token brut préalablement validé.
 * @param {string} input.newPassword Nouveau mot de passe validé.
 * @returns {Promise<{passwordChangedAt: Date}>}
 */
const resetUserPassword = async ({
    token,
    newPassword,
}) => {
    /*
     * Le token brut ne doit jamais être persisté.
     *
     * PasswordResetToken.tokenHash contient uniquement
     * son empreinte SHA-256.
     */
    const tokenHash = hashToken(token);

    const now = new Date();

    /*
     * Première lecture hors transaction.
     *
     * Elle permet d'éviter d'ouvrir une transaction pour un token
     * manifestement inutilisable.
     *
     * Cette lecture ne constitue PAS la validation définitive :
     * le token sera reconsommé conditionnellement dans la transaction.
     */
    const passwordResetToken =
        await PasswordResetToken.findOne({
            tokenHash,
            usedAt: null,
            revokedAt: null,
            expiresAt: mongoose.trusted({
                $gt: now,
            }),
        });

    if (!passwordResetToken) {
        throw new AppError(
            INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
            400,
        );
    }

    /*
     * Le User reste la source de vérité concernant
     * l'état actuel du compte.
     */
    const user = await User.findById(
        passwordResetToken.user,
    );

    if (!user) {
        throw new AppError(
            INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
            400,
        );
    };

    /*
     * Un compte clôturé est dans un état terminal :
     * un reset de mot de passe ne doit jamais permettre
     * de restaurer indirectement sa capacité d'authentification.
     *
     * Les autres statuts actuellement présents dans le projet
     * peuvent conserver la possibilité de sécuriser leur credential.
     */
    if (user.status === USER_STATUS.CLOSED) {
        throw new AppError(
            INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
            400,
        );
    }

    /*
     * Le mot de passe appartient à AuthIdentity LOCAL,
     * et non directement au User.
     *
     * passwordHash est select:false dans le modèle :
     * il doit donc être demandé explicitement.
     */
    const authIdentity =
        await AuthIdentity.findOne({
            user: user._id,
            provider: AUTH_PROVIDER.LOCAL,
        }).select('+passwordHash');

    if (!authIdentity) {
        throw new AppError(
            INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
            400,
        );
    }

    /*
     * Un nouveau salt produirait toujours un hash différent.
     *
     * Il faut donc vérifier le nouveau mot de passe
     * contre le hash actuel avant de recalculer son Argon2id.
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

    /*
     * Argon2id est volontairement coûteux.
     *
     * Le calcul est effectué avant la transaction afin
     * de réduire au maximum sa durée.
     */
    const newPasswordHash =
        await hashPassword(newPassword);

    const passwordChangedAt = new Date();

    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Verrou logique principal du workflow.
             *
             * Le token doit être encore totalement utilisable
             * AU MOMENT de l'écriture.
             *
             * Si deux requêtes concurrentes tentent de consommer
             * le même token, une seule pourra satisfaire ce filtre.
             */
            const consumedPasswordResetToken =
                await PasswordResetToken.findOneAndUpdate(
                    {
                        _id: passwordResetToken._id,
                        tokenHash,
                        usedAt: null,
                        revokedAt: null,
                        expiresAt: mongoose.trusted({
                            $gt: passwordChangedAt,
                        }),
                    },
                    {
                        $set: {
                            usedAt: passwordChangedAt,
                        },
                    },
                    {
                        returnDocument: 'after',
                        session,
                    },
                )

            /*
             * Aucun document retourné signifie que l'état du token
             * a changé depuis la première lecture :
             *
             * - expiration ;
             * - révocation ;
             * - consommation par une requête concurrente.
             */
            if (!consumedPasswordResetToken) {
                throw new AppError(
                    INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
                    400,
                );
            }

            /*
             * passwordHash actuel fait partie du filtre.
             *
             * Cette protection empêche d'écraser silencieusement
             * un mot de passe modifié par un autre workflow
             * entre notre lecture initiale et cette transaction.
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
             * Le statut est également revérifié dans la transaction.
             *
             * Le compte peut avoir changé d'état depuis la lecture
             * préliminaire. CLOSED doit rester impossible.
             *
             * Les seuls statuts actuellement implémentés et autorisés
             * ici sont donc ACTIVE, DISABLED et DELETION_REQUESTED.
             */
            const userUpdateResult =
                await User.updateOne(
                    {
                        _id: user._id,
                        status: mongoose.trusted({
                            $in: [
                                USER_STATUS.ACTIVE,
                                USER_STATUS.DISABLED,
                                USER_STATUS.DELETION_REQUESTED,
                            ],
                        }),
                    },
                    {
                        $set: {
                            passwordChangedAt,
                            updatedBy: null,
                        },
                    },
                    {
                        session,
                    },
                );

            if (
                userUpdateResult.matchedCount !== 1
            ) {
                throw new AppError(
                    INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
                    400,
                );
            }

            /*
             * Toutes les sessions existantes sont révoquées.
             *
             * Un reset de mot de passe ne doit pas laisser
             * fonctionner des refresh tokens créés avant
             * la modification du credential.
             */
            await revokeAllUserAuthSessions({
                userId: user._id,
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
    forgotUserPassword,
    registerUser,
    loginUser,
    resetUserPassword,
};