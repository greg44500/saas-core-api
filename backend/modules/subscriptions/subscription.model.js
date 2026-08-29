import mongoose from 'mongoose';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    DISCOUNT_TYPE,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_KIND,
} from '../../constants/subscription.constants.js';


const { Schema, model } = mongoose;


/**
 * Vérifie qu'une valeur est un entier positif ou nul.
 *
 * Les montants monétaires sont stockés dans l'unité monétaire mineure afin
 * d'éviter les imprécisions liées aux nombres décimaux.
 */
const isNonNegativeInteger = (value) =>
    Number.isInteger(value) && value >= 0;


/**
 * Représente l'abonnement réel d'un workspace à une offre commerciale.
 *
 * Subscription mémorise :
 * - le workspace bénéficiaire ;
 * - le plan attribué ;
 * - le cycle de vie de l'abonnement ;
 * - la périodicité et le tarif HT acceptés ;
 * - le fournisseur chargé de gérer l'abonnement ;
 * - les éventuelles remises et dérogations administratives.
 *
 * La consommation réelle et les quotas utilisés appartiendront à UsageMetric.
 * Les montants de TVA et TTC appartiendront au futur module de facturation.
 */
const subscriptionSchema = new Schema(
    {
        /**
         * Workspace bénéficiaire de la souscription.
         *
         * La V1 rattache directement chaque souscription à un workspace.
         * Le représentant humain reste identifié par les membres et les rôles
         * du workspace, ainsi que par les champs de traçabilité.
         */
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },


        /**
         * Offre commerciale actuellement attribuée au workspace.
         *
         * Le plan peut changer lors d'un futur upgrade ou downgrade. Ce champ
         * n'est donc pas immutable.
         */
        plan: {
            type: Schema.Types.ObjectId,
            ref: 'Plan',
            required: true,
        },

        /**
         * Rôle fonctionnel de la souscription dans le workspace.
         *
         * Une souscription baseline représente l'offre de référence du
         * workspace. Une souscription commercial représente une offre payante
         * ou en essai pouvant fournir les droits effectifs du workspace.
         *
         * Ce champ ne possède volontairement aucun default : chaque chemin de
         * création doit déclarer explicitement son intention métier afin qu'une
         * future souscription commerciale ne puisse pas devenir baseline par
         * omission.
         *
         * Ce champ ne décrit pas le cycle de vie de la souscription :
         * cette responsabilité appartient exclusivement à status.
         */
        kind: {
            type: String,
            enum: Object.values(SUBSCRIPTION_KIND),
            required: true,
        },


        /**
         * État actuel du cycle de vie de la souscription.
         */
        status: {
            type: String,
            enum: Object.values(SUBSCRIPTION_STATUS),
            default: SUBSCRIPTION_STATUS.ACTIVE,
            required: true,
        },


        /**
         * Début de la période contractuelle ou d'utilisation actuelle.
         *
         * Pour le plan gratuit, cette date correspond à la création de la
         * souscription, même si aucune facturation périodique n'est prévue.
         */
        currentPeriodStart: {
            type: Date,
            default: Date.now,
            required: true,
        },


        /**
         * Fin de la période actuelle.
         *
         * null convient au plan gratuit, qui n'a pas d'échéance contractuelle
         * ou de renouvellement payant dans la V1.
         */
        currentPeriodEnd: {
            type: Date,
            default: null,
            validate: {
                validator: function validateCurrentPeriodEnd(value) {
                    return (
                        value === null
                        || value > this.currentPeriodStart
                    );
                },
                message:
                    'La fin de période doit être postérieure au début de période.',
            },
        },


        /**
         * Date de fin d'une éventuelle période d'essai.
         *
         * null indique que la souscription ne bénéficie pas d'un essai.
         * Les règles conditionnelles liées au statut trialing seront appliquées
         * ultérieurement par SubscriptionService.
         */
        trialEndsAt: {
            type: Date,
            default: null,
            validate: {
                validator: function validateTrialEnd(value) {
                    return (
                        value === null
                        || value > this.currentPeriodStart
                    );
                },
                message:
                    'La fin de l’essai doit être postérieure au début de période.',
            },
        },


        /**
         * Demande de résiliation à la fin de la période actuelle.
         *
         * Une valeur true ne transforme pas immédiatement le statut en
         * canceled : la souscription reste utilisable jusqu'à son échéance.
         */
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false,
            required: true,
        },


        /**
         * Périodicité commerciale choisie pour cette souscription.
         *
         * Le plan gratuit utilise `none`. Une future offre payante utilisera
         * `monthly` ou `yearly`.
         */
        billingInterval: {
            type: String,
            enum: Object.values(BILLING_INTERVAL),
            default: BILLING_INTERVAL.NONE,
            required: true,
        },


        /**
         * Devise du tarif accepté par la souscription.
         *
         * La devise est conservée ici avec l'instantané tarifaire afin qu'une
         * modification future du Plan ne change pas rétroactivement les
         * conditions déjà attribuées.
         */
        currency: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            minlength: 3,
            maxlength: 3,
            match: [
                /^[A-Z]{3}$/,
                'Le code devise de la souscription est invalide.',
            ],
        },


        /**
         * Tarif HT accepté pour la périodicité sélectionnée.
         *
         * Ce montant est un instantané du tarif applicable au moment de la
         * création ou du changement de plan.
         *
         * Exemple :
         * - billingInterval: monthly ;
         * - priceExclTaxMinor: 1990 ;
         * - currency: EUR ;
         * représente 19,90 € HT par mois.
         */
        priceExclTaxMinor: {
            type: Number,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'Le prix HT de la souscription doit être un entier positif ou nul.',
            },
        },


        /**
         * Fournisseur responsable de la souscription.
         *
         * La V1 utilise manual. Stripe est seulement anticipé.
         */
        provider: {
            type: String,
            enum: Object.values(BILLING_PROVIDER),
            default: BILLING_PROVIDER.MANUAL,
            required: true,
        },


        /**
         * Identifiant du client chez le fournisseur de paiement.
         *
         * null est attendu pour une souscription manuelle gratuite.
         */
        providerCustomerId: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },


        /**
         * Identifiant de la souscription chez le fournisseur de paiement.
         *
         * Il permettra plus tard d'associer les événements reçus du fournisseur
         * à la souscription locale correspondante.
         */
        providerSubscriptionId: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },


        /**
         * Type de réduction actuellement appliquée.
         */
        discountType: {
            type: String,
            enum: Object.values(DISCOUNT_TYPE),
            default: DISCOUNT_TYPE.NONE,
            required: true,
        },


        /**
         * Valeur de la réduction.
         *
         * Son interprétation dépend de discountType :
         * - percentage : pourcentage ;
         * - fixed_amount : montant dans l'unité monétaire mineure ;
         * - none : zéro.
         *
         * Les règles conditionnelles précises appartiendront au service.
         */
        discountValue: {
            type: Number,
            default: 0,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'La valeur de réduction doit être un entier positif ou nul.',
            },
        },


        /**
         * Justification commerciale ou administrative de la réduction.
         */
        discountReason: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },


        /**
         * Date de fin éventuelle de la réduction.
         *
         * null représente notamment une absence de réduction ou une réduction
         * sans échéance encore définie.
         */
        discountEndsAt: {
            type: Date,
            default: null,
        },


        /**
         * Indique qu'une règle normale de souscription a été remplacée par une
         * décision explicite de l'administration plateforme.
         */
        manualOverride: {
            type: Boolean,
            default: false,
            required: true,
        },


        /**
         * Motif expliquant la dérogation administrative.
         *
         * SubscriptionService rendra ce champ obligatoire lorsque
         * manualOverride vaut true.
         */
        manualOverrideReason: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },


        /**
         * Administrateur plateforme ayant accordé la dérogation.
         */
        manualOverrideBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },


        /**
         * Utilisateur ayant initialement créé la souscription.
         *
         * null représente une création système, notamment lors de la création
         * automatique du plan gratuit d'un workspace.
         */
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },


        /**
         * Utilisateur responsable de la dernière modification.
         */
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    },
);


/**
 * Garantit qu'un workspace ne possède qu'une seule souscription courante de
 * chaque rôle fonctionnel.
 *
 * La paire workspace + kind permet de conserver une baseline Free active en
 * parallèle d'une souscription commerciale payante ou en trial.
 *
 * trialing, active et past_due représentent des souscriptions encore
 * opérationnelles ou contractuellement en cours.
 * canceled et expired restent conservées pour l'historique.
 */
subscriptionSchema.index(
    {
        workspace: 1,
        kind: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            status: {
                $in: [
                    SUBSCRIPTION_STATUS.TRIALING,
                    SUBSCRIPTION_STATUS.ACTIVE,
                    SUBSCRIPTION_STATUS.PAST_DUE,
                ],
            },
        },
    },
);


/**
 * Facilite la recherche des souscriptions rattachées à un plan donné,
 * notamment dans l'administration plateforme.
 */
subscriptionSchema.index({
    plan: 1,
    status: 1,
});


/**
 * Facilite la synchronisation avec un fournisseur de paiement.
 */
subscriptionSchema.index({
    provider: 1,
    providerSubscriptionId: 1,
});


/**
 * Empêche deux souscriptions locales de référencer le même identifiant externe.
 *
 * L'index ne concerne que les documents possédant réellement un identifiant
 * fournisseur sous forme de chaîne. Les souscriptions manuelles avec une
 * valeur null ne sont donc pas concernées.
 */
subscriptionSchema.index(
    {
        providerSubscriptionId: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            providerSubscriptionId: {
                $type: 'string',
            },
        },
    },
);


const Subscription = model(
    'Subscription',
    subscriptionSchema,
);


export { Subscription };
