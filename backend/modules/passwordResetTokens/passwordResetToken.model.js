import mongoose from 'mongoose';


const passwordResetTokenSchema = new mongoose.Schema(
    {
        /**
         * Utilisateur auquel appartient la demande.
         *
         * Un token ne doit jamais pouvoir être réattribué
         * à un autre utilisateur.
         */
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        /**
         * Empreinte SHA-256 du token de réinitialisation.
         *
         * Le token brut ne doit jamais être enregistré.
         */
        tokenHash: {
            type: String,
            required: true,
            immutable: true,
            select: false,
            match: /^[a-f0-9]{64}$/,
        },

        /**
         * Date au-delà de laquelle le token n'est plus utilisable.
         *
         * Le service devra toujours vérifier cette date :
         * l'index TTL ne sert qu'au nettoyage différé.
         */
        expiresAt: {
            type: Date,
            required: true,
            immutable: true,
        },

        /**
         * Date de consommation réussie du token.
         *
         * null signifie que le token n'a pas encore été utilisé.
         */
        usedAt: {
            type: Date,
            default: null,
        },

        /**
         * Date de révocation explicite du token.
         *
         * null signifie qu'aucune révocation n'a été enregistrée.
         */
        revokedAt: {
            type: Date,
            default: null,
        },

        /**
         * Adresse IP observée lors de la demande.
         *
         * Elle constitue une information d'audit,
         * et non une preuve d'identité.
         */
        ipAddress: {
            type: String,
            default: null,
            maxlength: 64,
            immutable: true,
        },

        /**
         * User-Agent observé lors de la demande.
         *
         * Il est conservé uniquement comme contexte de sécurité.
         */
        userAgent: {
            type: String,
            default: null,
            maxlength: 1024,
            immutable: true,
        },
    },
    {
        timestamps: true,
    },
);


/**
 * Permet de retrouver le document à partir du hash
 * du token présenté lors de la réinitialisation.
 */
passwordResetTokenSchema.index(
    { tokenHash: 1 },
    { unique: true },
);

/**
 * Supporte la consultation et la révocation
 * des demandes appartenant à un utilisateur.
 */
passwordResetTokenSchema.index({
    user: 1,
    createdAt: -1,
});

/**
 * Supprime automatiquement les documents expirés.
 *
 * MongoDB exécute ce nettoyage de manière différée :
 * expiresAt doit donc aussi être contrôlé par le service.
 */
passwordResetTokenSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
);


const PasswordResetToken = mongoose.model(
    'PasswordResetToken',
    passwordResetTokenSchema,
);


export { PasswordResetToken };