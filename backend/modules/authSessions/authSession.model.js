import mongoose from 'mongoose';

import { AUTH_SESSION_REVOKED_REASON } from '../../constants/authSession.constants.js';

const authSessionSchema = new mongoose.Schema(
    {
        // -------------------------------------------------------------------------
        // Identité
        // -------------------------------------------------------------------------

        /**
         * Utilisateur propriétaire de cette session.
         *
         * Une session ne doit jamais pouvoir être réattribuée à un autre User.
         */
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        // -------------------------------------------------------------------------
        // Refresh token
        // -------------------------------------------------------------------------

        /**
         * Hash du refresh token associé à cette génération de session.
         *
         * Le refresh token brut ne doit jamais être persisté.
         * Une rotation crée une nouvelle AuthSession au lieu de remplacer ce hash.
         */
        refreshTokenHash: {
            type: String,
            required: true,
            immutable: true,
            select: false,
        },

        // -------------------------------------------------------------------------
        // Rotation
        // -------------------------------------------------------------------------

        /**
         * Identifiant commun à toutes les générations issues d'une même connexion.
         *
         * Il permet notamment de révoquer toute une chaîne lorsqu'une
         * réutilisation suspecte d'un ancien refresh token est détectée.
         */
        familyId: {
            type: String,
            required: true,
            immutable: true,
            maxlength: 128,
        },

        /**
         * Session créée pour remplacer cette session lors d'une rotation.
         *
         * null signifie que cette génération n'a pas été remplacée.
         */
        replacedBySession: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AuthSession',
            default: null,
        },

        /**
         * Date de consommation réussie du refresh token de cette session.
         *
         * Chaque génération de refresh token est conçue pour être utilisée
         * avec succès une seule fois.
         */
        usedAt: {
            type: Date,
            default: null,
        },

        // -------------------------------------------------------------------------
        // Expiration
        // -------------------------------------------------------------------------

        /**
         * Date d'expiration absolue de cette génération de session.
         *
         * La durée est calculée par le service d'authentification.
         * Le modèle ne décide pas de la politique de durée des sessions.
         */
        expiresAt: {
            type: Date,
            required: true,
            immutable: true,
        },

        // -------------------------------------------------------------------------
        // Révocation
        // -------------------------------------------------------------------------

        /**
         * Date à laquelle cette session a été explicitement révoquée.
         *
         * Une expiration naturelle n'est pas une révocation.
         */
        revokedAt: {
            type: Date,
            default: null,
        },

        /**
         * User ayant provoqué la révocation lorsqu'un acteur humain existe.
         *
         * null représente notamment les opérations système telles que
         * la rotation automatique.
         */
        revokedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        /**
         * Cause métier de la révocation.
         */
        revokedReason: {
            type: String,
            enum: Object.values(AUTH_SESSION_REVOKED_REASON),
            default: null,
        },

        // -------------------------------------------------------------------------
        // Compromission
        // -------------------------------------------------------------------------

        /**
         * Date à laquelle cette session a été marquée comme appartenant
         * à une famille compromise.
         *
         * Ce champ est réservé à la détection de réutilisation suspecte
         * d'un refresh token et ne représente pas une simple révocation.
         */
        compromisedAt: {
            type: Date,
            default: null,
        },

        // -------------------------------------------------------------------------
        // Contexte de connexion
        // -------------------------------------------------------------------------

        /**
         * User-Agent observé lors de la création de cette génération.
         *
         * Il s'agit d'un indicateur de contexte et non d'une preuve d'identité.
         */
        userAgent: {
            type: String,
            default: null,
            maxlength: 1024,
            immutable: true,
        },

        /**
         * Adresse IP observée lors de la création de cette génération.
         *
         * Elle sert au contexte de sécurité et à l'audit, mais ne constitue
         * pas une preuve d'identité.
         */
        ipAddress: {
            type: String,
            default: null,
            maxlength: 64,
            immutable: true,
        },
    },
    {
        timestamps: true,
    }
);

// -----------------------------------------------------------------------------
// Index
// -----------------------------------------------------------------------------

/**
 * Le refresh recherche une session à partir du hash du token reçu.
 *
 * Deux générations ne doivent jamais posséder le même refreshTokenHash.
 */
authSessionSchema.index(
    { refreshTokenHash: 1 },
    { unique: true }
);

/**
 * Permet de retrouver rapidement toutes les générations appartenant
 * à une même famille lors d'une révocation pour compromission.
 */
authSessionSchema.index({ familyId: 1 });

/**
 * Supporte les opérations portant sur les sessions d'un utilisateur :
 * logout-all, révocation administrative et consultation des sessions.
 */
authSessionSchema.index({
    user: 1,
    revokedAt: 1,
    expiresAt: 1,
});

/**
 * Nettoie automatiquement les documents après expiration.
 *
 * Attention : le TTL sert uniquement au nettoyage.
 * Le service doit toujours contrôler expiresAt avant d'accepter un refresh.
 */
authSessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

// -----------------------------------------------------------------------------
// Invariants de document
// -----------------------------------------------------------------------------

authSessionSchema.pre('validate', function () {
    const hasRevokedAt = this.revokedAt !== null;
    const hasRevokedReason = this.revokedReason !== null;

    /**
     * Une révocation doit toujours avoir simultanément une date et une raison.
     */
    if (hasRevokedAt !== hasRevokedReason) {
        this.invalidate(
            'revokedReason',
            'revokedAt et revokedReason doivent être renseignés ensemble'
        );
    }

    /**
     * Une session ne peut pointer vers une session de remplacement
     * que si elle a été révoquée à cause d'une rotation.
     */
    if (
        this.replacedBySession !== null &&
        this.revokedReason !== AUTH_SESSION_REVOKED_REASON.TOKEN_ROTATED
    ) {
        this.invalidate(
            'replacedBySession',
            'replacedBySession nécessite une révocation token_rotated'
        );
    }

    /**
     * Une session consommée doit nécessairement avoir été révoquée
     * par rotation.
     *
     * Dans notre architecture, un refresh token est à usage unique :
     * son utilisation réussie entraîne immédiatement sa rotation.
     */
    if (
        this.usedAt !== null &&
        this.revokedReason !== AUTH_SESSION_REVOKED_REASON.TOKEN_ROTATED
    ) {
        this.invalidate(
            'usedAt',
            'usedAt nécessite une révocation token_rotated'
        );
    }
});

export const AuthSession = mongoose.model(
    'AuthSession',
    authSessionSchema
);