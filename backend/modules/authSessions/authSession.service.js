import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import { AUTH_SESSION_REVOKED_REASON } from '../../constants/authSession.constants.js';
import { AppError } from '../../utils/AppError.js';
import { addDays } from '../../utils/date.js';
import {
    generateRefreshToken,
    hashToken,
} from '../../utils/token.js';
import { User } from '../users/user.model.js';
import { AuthSession } from './authSession.model.js';


const INVALID_REFRESH_SESSION_MESSAGE =
    'Session de rafraîchissement invalide';


/**
 * Crée la première génération d'une session d'authentification.
 *
 * Une nouvelle connexion crée toujours une nouvelle famille.
 *
 * Le refresh token brut est uniquement retourné en mémoire.
 * Seul son hash SHA-256 est persisté dans MongoDB.
 *
 * @param {object} input
 * @param {import('mongoose').Types.ObjectId|string} input.userId
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<{
 *   authSession: import('mongoose').Document,
 *   refreshToken: string
 * }>}
 */
const createInitialAuthSession = async ({
    userId,
    ipAddress = null,
    userAgent = null,
}) => {
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const familyId = randomUUID();

    const expiresAt = addDays(
        new Date(),
        env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
    );

    const authSession = await AuthSession.create({
        user: userId,
        refreshTokenHash,
        familyId,
        expiresAt,
        ipAddress,
        userAgent,
    });

    return {
        authSession,
        refreshToken,
    };
};
/**
 * Révoque la session correspondant au refresh token courant.
 *
 * Cette fonction est utilisée lors d'un logout classique.
 *
 * Le logout est volontairement idempotent :
 *
 * - token absent ;
 * - token inconnu ;
 * - session déjà révoquée ;
 *
 * ne doivent pas révéler d'information supplémentaire au client.
 *
 * Seule une session encore active est modifiée.
 *
 * @param {object} input
 * @param {string|null|undefined} input.refreshToken
 * @returns {Promise<import('mongoose').Document|null>}
 */
const revokeCurrentAuthSession = async ({
    refreshToken,
}) => {
    if (!refreshToken) {
        return null;
    }

    const refreshTokenHash = hashToken(refreshToken);
    const now = new Date();

    /*
     * La condition revokedAt: null rend l'opération idempotente.
     *
     * Si la session est déjà révoquée, aucune nouvelle modification
     * n'est effectuée et null est retourné.
     */
    const revokedAuthSession =
        await AuthSession.findOneAndUpdate(
            {
                refreshTokenHash,
                revokedAt: null,
            },
            {
                $set: {
                    revokedAt: now,
                    revokedReason:
                        AUTH_SESSION_REVOKED_REASON.LOGOUT,
                },
            },
            {
                returnDocument: 'after',
            },
        );

    return revokedAuthSession;
};

/**
 * Compromet toute une famille de sessions après détection
 * d'une réutilisation suspecte d'un refresh token déjà roté.
 *
 * Règle importante :
 *
 * - toutes les générations reçoivent compromisedAt ;
 * - les anciennes générations déjà révoquées conservent leur
 *   revokedReason historique ;
 * - seules les générations encore actives sont révoquées avec
 *   TOKEN_REUSE_DETECTED.
 *
 * Exemple :
 *
 * S1 → token_rotated
 * S2 → token_rotated
 * S3 → active
 *
 * devient :
 *
 * S1 → token_rotated + compromisedAt
 * S2 → token_rotated + compromisedAt
 * S3 → token_reuse_detected + compromisedAt
 *
 * @param {object} input
 * @param {string} input.familyId
 * @param {Date} input.now
 * @param {import('mongoose').ClientSession} input.session
 * @returns {Promise<void>}
 */
const compromiseAuthSessionFamily = async ({
    familyId,
    now,
    session,
}) => {
    /*
     * Toute la famille est marquée compromise.
     *
     * On ne touche pas ici aux raisons de révocation afin
     * de conserver l'historique des générations précédentes.
     */
    await AuthSession.updateMany(
        {
            familyId,
            compromisedAt: null,
        },
        {
            $set: {
                compromisedAt: now,
            },
        },
        {
            session,
        },
    );

    /*
     * Seules les sessions encore actives sont révoquées à cause
     * du reuse détecté.
     *
     * Une ancienne génération déjà rotée conserve donc :
     *
     * revokedReason = token_rotated
     */
    await AuthSession.updateMany(
        {
            familyId,
            revokedAt: null,
        },
        {
            $set: {
                revokedAt: now,
                revokedReason:
                    AUTH_SESSION_REVOKED_REASON.TOKEN_REUSE_DETECTED,
            },
        },
        {
            session,
        },
    );
};


/**
 * Effectue la rotation d'un refresh token.
 *
 * Une rotation normale :
 *
 * R1 / S1
 * ↓
 * R2 / S2
 *
 * S1 devient définitivement consommée.
 * S2 appartient à la même familyId.
 *
 * La modification de S1 et la création de S2 sont exécutées
 * dans une transaction MongoDB.
 *
 * Si un ancien refresh token déjà roté est présenté à nouveau,
 * la famille est compromise dans une transaction dédiée.
 *
 * @param {object} input
 * @param {string} input.refreshToken
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<{
 *   user: import('mongoose').Document,
 *   authSession: import('mongoose').Document,
 *   refreshToken: string
 * }>}
 */
const rotateAuthSession = async ({
    refreshToken,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!refreshToken) {
        throw new AppError(
            INVALID_REFRESH_SESSION_MESSAGE,
            401,
        );
    }

    /*
     * Le token brut ne doit jamais être utilisé comme donnée persistée.
     * Nous retrouvons toujours AuthSession grâce à son hash SHA-256.
     */
    const currentRefreshTokenHash = hashToken(refreshToken);

    const now = new Date();

    /*
     * Première lecture hors transaction.
     *
     * Elle permet notamment d'identifier un token déjà roté
     * avant de choisir entre :
     *
     * - rotation normale ;
     * - compromission de famille.
     *
     * La vraie consommation de la session restera ensuite protégée
     * par un findOneAndUpdate conditionnel dans la transaction.
     */
    const currentAuthSession = await AuthSession.findOne({
        refreshTokenHash: currentRefreshTokenHash,
    });

    if (!currentAuthSession) {
        throw new AppError(
            INVALID_REFRESH_SESSION_MESSAGE,
            401,
        );
    }

    /*
     * MongoDB TTL nettoie les documents expirés de manière asynchrone.
     * Le service doit donc toujours contrôler expiresAt lui-même.
     */
    if (currentAuthSession.expiresAt <= now) {
        throw new AppError(
            INVALID_REFRESH_SESSION_MESSAGE,
            401,
        );
    }

    /*
     * Une famille déjà marquée compromise ne peut plus produire
     * de nouveaux refresh tokens.
     */
    if (currentAuthSession.compromisedAt) {
        throw new AppError(
            INVALID_REFRESH_SESSION_MESSAGE,
            401,
        );
    }

    /*
     * Détection du reuse.
     *
     * Le token correspond à une génération qui a déjà été
     * correctement consommée lors d'une rotation précédente.
     *
     * Sa réapparition est donc considérée comme suspecte.
     */
    const isRotatedTokenReuse =
        currentAuthSession.usedAt !== null &&
        currentAuthSession.revokedAt !== null &&
        currentAuthSession.revokedReason ===
        AUTH_SESSION_REVOKED_REASON.TOKEN_ROTATED &&
        currentAuthSession.replacedBySession !== null;

    if (isRotatedTokenReuse) {
        /*
         * IMPORTANT :
         *
         * La compromission est exécutée dans sa propre transaction.
         *
         * Nous ne lançons PAS l'AppError à l'intérieur du callback,
         * car cela provoquerait le rollback de compromisedAt et des
         * révocations que nous voulons justement conserver.
         */
        await mongoose.connection.transaction(
            async (session) => {
                await compromiseAuthSessionFamily({
                    familyId: currentAuthSession.familyId,
                    now,
                    session,
                });
            },
        );

        /*
         * La transaction de compromission est maintenant commitée.
         * Nous pouvons refuser la requête.
         */
        throw new AppError(
            INVALID_REFRESH_SESSION_MESSAGE,
            401,
        );
    }

    /*
     * Une session révoquée pour une autre raison :
     *
     * logout
     * logout-all
     * user disabled
     * password changed
     * admin revoke
     * etc.
     *
     * n'est pas considérée comme un reuse de rotation.
     * Elle est simplement inutilisable.
     */
    if (
        currentAuthSession.revokedAt ||
        currentAuthSession.usedAt ||
        currentAuthSession.replacedBySession
    ) {
        throw new AppError(
            INVALID_REFRESH_SESSION_MESSAGE,
            401,
        );
    }

    /*
     * Le User est contrôlé avant la rotation.
     *
     * MongoDB reste la source de vérité du statut actuel
     * du compte.
     */
    const user = await User.findById(
        currentAuthSession.user,
    );

    if (!user) {
        throw new AppError(
            INVALID_REFRESH_SESSION_MESSAGE,
            401,
        );
    }

    if (user.status === 'disabled') {
        throw new AppError(
            'Compte désactivé',
            403,
        );
    }

    if (user.status === 'closed') {
        throw new AppError(
            'Compte clôturé',
            403,
        );
    }

    /*
     * deletion_requested reste volontairement authentifiable.
     *
     * Le blocage des écritures métier sera traité séparément
     * par la politique read-only du compte.
     */

    const nextRefreshToken = generateRefreshToken();
    const nextRefreshTokenHash =
        hashToken(nextRefreshToken);

    const nextExpiresAt = addDays(
        now,
        env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
    );

    /*
     * On réserve l'_id de S2 avant sa création.
     *
     * Cela permet à S1 de référencer immédiatement son descendant
     * dans le même findOneAndUpdate qui consomme S1.
     */
    const nextAuthSessionId =
        new mongoose.Types.ObjectId();

    let nextAuthSession;

    /*
     * Rotation normale.
     *
     * La consommation de S1 et la création de S2 font partie
     * de la même transaction.
     */
    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Cette opération constitue le verrou logique principal.
             *
             * Une session n'est consommable que si elle est encore
             * totalement active AU MOMENT de l'écriture.
             *
             * Deux requêtes concurrentes ne peuvent donc pas toutes
             * les deux faire correspondre ce filtre.
             */
            const consumedAuthSession =
                await AuthSession.findOneAndUpdate(
                    {
                        _id: currentAuthSession._id,
                        revokedAt: null,
                        usedAt: null,
                        replacedBySession: null,
                        compromisedAt: null,
                        expiresAt: mongoose.trusted({
                            $gt: now,
                        }),
                    },
                    {
                        $set: {
                            usedAt: now,
                            revokedAt: now,
                            revokedReason:
                                AUTH_SESSION_REVOKED_REASON.TOKEN_ROTATED,
                            replacedBySession:
                                nextAuthSessionId,
                        },
                    },
                    {
                        returnDocument: 'after',
                        session,
                    },
                );

            /*
             * Si aucune session n'est retournée, son état a changé
             * entre la première lecture et notre tentative de consommation.
             *
             * Une autre requête concurrente a notamment pu gagner.
             */
            if (!consumedAuthSession) {
                throw new AppError(
                    INVALID_REFRESH_SESSION_MESSAGE,
                    401,
                );
            }

            /*
             * Création de la génération suivante.
             *
             * Le familyId reste identique :
             * S1 et S2 appartiennent à la même connexion logique.
             */
            const [createdAuthSession] =
                await AuthSession.create(
                    [
                        {
                            _id: nextAuthSessionId,
                            user: currentAuthSession.user,
                            refreshTokenHash:
                                nextRefreshTokenHash,
                            familyId:
                                currentAuthSession.familyId,
                            expiresAt: nextExpiresAt,
                            ipAddress,
                            userAgent,
                        },
                    ],
                    {
                        session,
                    },
                );

            nextAuthSession = createdAuthSession;
        },
    );

    return {
        user,
        authSession: nextAuthSession,
        refreshToken: nextRefreshToken,
    };
};

/**
 * Révoque toutes les AuthSession encore actives d'un utilisateur.
 *
 * Cette opération est utilisée pour un logout global :
 * toutes les connexions actives du compte deviennent inutilisables.
 *
 * Les sessions déjà révoquées ne sont pas modifiées afin de
 * conserver leur raison historique de révocation.
 *
 * @param {object} input
 * @param {import('mongoose').Types.ObjectId|string} input.userId
 * @returns {Promise<object>}
 */

const revokeAllUserAuthSessions = async ({ userId, }) => {
    const now = new Date();
    const result = await AuthSession.updateMany(
        {
            user: userId,
            revokedAt: null,
        },
        {
            $set: {
                revokedAt: now,
                revokedReason: AUTH_SESSION_REVOKED_REASON.LOGOUT_ALL,
            },
        },
    );
    return result;
}


export {
    createInitialAuthSession,
    rotateAuthSession,
    revokeCurrentAuthSession,
    revokeAllUserAuthSessions
};