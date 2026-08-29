import mongoose from 'mongoose';

import { PLAN_STATUS } from '../../constants/plan.constants.js';


const { Schema, model } = mongoose;


/**
 * Format utilisé pour les identifiants fonctionnels du plan.
 *
 * Exemples valides :
 * - free
 * - starter
 * - premium_v2
 * - enterprise-custom
 *
 * Une clé est destinée au backend et doit rester stable dans le temps.
 * Le nom commercial affiché à l'utilisateur reste indépendant.
 */
const PLAN_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;


/**
 * Format générique des clés de fonctionnalités et de métriques.
 *
 * Le modèle contrôle uniquement leur structure.
 * Le futur PlanService vérifiera ensuite que la clé appartient réellement
 * au registre des features ou métriques disponible dans l'application.
 *
 * Exemples :
 * - file_upload
 * - team_management
 * - storage_bytes
 * - file_uploads_monthly
 */
const PLAN_CAPABILITY_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;


/**
 * Vérifie qu'une valeur représente un entier positif ou nul.
 *
 * Les montants monétaires sont stockés en unités mineures et les limites
 * correspondent à des quantités discrètes. Les valeurs décimales ne doivent
 * donc pas être acceptées dans ces champs.
 */
const isNonNegativeInteger = (value) =>
    Number.isInteger(value) && value >= 0;

/**
 * Vérifie qu'une valeur constitue une limite de plan valide.
 *
 * Convention :
 * - null représente une limite explicitement illimitée ;
 * - 0 interdit toute consommation ;
 * - un entier positif définit un plafond quantitatif.
 *
 * L'absence d'une metricKey dans `limits` reste différente de null :
 * elle signale une configuration absente ou une métrique non applicable.
 */
const isValidPlanLimit = (value) =>
    value === null || isNonNegativeInteger(value);

/**
 * Représente une offre commerciale disponible sur la plateforme.
 *
 * Plan décrit ce qui est proposé :
 * - identité commerciale ;
 * - tarification ;
 * - fonctionnalités ;
 * - limites.
 *
 * Il ne représente ni un abonnement actif, ni la consommation réelle d'un
 * workspace. Ces responsabilités appartiendront respectivement à Subscription
 * et UsageMetric.
 */
const planSchema = new Schema(
    {
        /**
         * Identifiant fonctionnel stable du plan.
         *
         * Cette valeur peut être utilisée par les seeds et les services.
         * Elle est volontairement indépendante du nom commercial affiché.
         *
         * Une fois le plan créé, cette clé ne doit plus changer afin de préserver
         * les références fonctionnelles et l'historique.
         */
        key: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
            trim: true,
            lowercase: true,
            minlength: 2,
            maxlength: 64,
            match: [
                PLAN_KEY_PATTERN,
                'Le format de la clé du plan est invalide.',
            ],
        },


        /**
         * Nom commercial présenté à l'utilisateur.
         *
         * Contrairement à `key`, cette valeur peut évoluer sans modifier
         * l'identité fonctionnelle du plan.
         */
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
        },


        /**
         * Description commerciale facultative du plan.
         */
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },


        /**
         * État administratif du plan.
         *
         * Il détermine si le plan est encore exploitable par la plateforme.
         * Il reste distinct de `isPublic`, qui contrôle uniquement sa visibilité
         * dans le catalogue commercial.
         */
        status: {
            type: String,
            enum: Object.values(PLAN_STATUS),
            default: PLAN_STATUS.ACTIVE,
            required: true,
        },


        /**
         * Indique si le plan peut apparaître publiquement dans le catalogue.
         *
         * La valeur par défaut est volontairement false : une nouvelle offre
         * ne doit pas devenir visible simplement parce qu'un administrateur ou
         * un seed a oublié de définir explicitement sa publication.
         */
        isPublic: {
            type: Boolean,
            default: false,
            required: true,
        },


        /**
         * Ordre de présentation du plan dans les listes commerciales.
         *
         * Le backend conserve cette information afin que chaque frontend
         * n'ait pas à reconstruire arbitrairement son propre ordre.
         */
        displayOrder: {
            type: Number,
            default: 0,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'L’ordre d’affichage du plan doit être un entier positif ou nul.',
            },
        },

        /**
 * Indique si cette offre commerciale peut être essayée.
 *
 * Cette propriété décrit uniquement l'éligibilité du plan au trial.
 * L'éligibilité d'une identité utilisateur et l'état concret d'un essai
 * appartiennent respectivement à TrialEligibility et Subscription.
 */
        trialEnabled: {
            type: Boolean,
            default: false,
            required: true,
        },


        /**
         * Durée commerciale du trial exprimée en jours.
         *
         * null signifie que le plan ne propose aucun trial.
         * Lorsqu'un trial est accordé, cette durée sert uniquement à calculer
         * le `trialEndsAt` initial de la Subscription. Une modification future
         * de cette valeur ne doit donc jamais modifier un trial déjà commencé.
         */
        trialDurationDays: {
            type: Number,
            default: null,
        },


        /**
         * Devise utilisée par les prix du plan.
         *
         * Le modèle vérifie seulement la structure d'un code ISO alphabétique
         * sur trois caractères. La politique commerciale pourra restreindre les
         * devises réellement autorisées dans le service.
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
                'Le code devise du plan est invalide.',
            ],
        },


        /**
   * Prix mensuel hors taxes exprimé dans l'unité monétaire mineure.
   *
   * Exemple :
   * 1990 avec EUR représente 19,90 € HT.
   *
   * Le montant TTC sera calculé au moment de la présentation ou de la
   * facturation selon le taux de taxe réellement applicable au client.
   */
        priceMonthlyExclTaxMinor: {
            type: Number,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'Le prix mensuel HT doit être un entier positif ou nul.',
            },
        },


        /**
   * Prix annuel hors taxes exprimé dans l'unité monétaire mineure.
   *
   * Le stockage du prix HT permet d'appliquer ultérieurement la fiscalité
   * correspondant au client et à la date de facturation.
   */
        priceYearlyExclTaxMinor: {
            type: Number,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'Le prix annuel HT doit être un entier positif ou nul.',
            },
        },


        /**
         * Fonctionnalités incluses dans le plan.
         *
         * Le schéma vérifie uniquement la forme générique de chaque clé.
         * Il ne connaît volontairement aucune fonctionnalité métier spécifique.
         *
         * Le futur PlanService contrôlera que chaque feature appartient au
         * registre de fonctionnalités réellement chargé par le socle ou
         * l'application métier.
         */
        features: {
            type: [
                {
                    type: String,
                    trim: true,
                    lowercase: true,
                    match: [
                        PLAN_CAPABILITY_KEY_PATTERN,
                        'Le format de la clé de fonctionnalité est invalide.',
                    ],
                },
            ],
            default: [],
            validate: {
                /**
                 * Une même fonctionnalité ne doit pas apparaître plusieurs fois
                 * dans un plan : la duplication n'apporterait aucune sémantique
                 * supplémentaire et compliquerait les traitements ultérieurs.
                 */
                validator: (features) =>
                    new Set(features).size === features.length,
                message:
                    'Les fonctionnalités du plan ne doivent pas contenir de doublons.',
            },
        },


        /**
         * Limites quantitatives associées au plan.
         *
         * Le stockage sous forme de Map permet d'ajouter des métriques propres
         * à un futur SaaS sans modifier structurellement Plan.
         *
         * Exemple :
         * {
         *     members: 5,
         *     storage_bytes: 1073741824
         *     file_uploads_monthly: null
         * }
         *  `null` signifie que la métrique est explicitement illimitée.
        *   Une clé absente ne doit pas être interprétée comme illimitée
         *
         * La présence réelle d'une métrique dans le registre applicatif sera
         * contrôlée ultérieurement par le service.
         */
        limits: {
            type: Map,
            of: {
                type: Number,
                validate: {
                    validator: isValidPlanLimit,
                    message:
                        'Une limite de plan doit être un entier positif ou nul.',
                },
            },
            default: () => new Map(),
            validate: {
                /**
                 * Les clés de la Map restent génériques, mais doivent respecter
                 * un format prévisible afin d'éviter des métriques incohérentes
                 * ou impossibles à référencer proprement dans UsageMetric.
                 */
                validator: (limits) => {
                    if (!(limits instanceof Map)) {
                        return false;
                    }

                    return [...limits.keys()].every((key) =>
                        PLAN_CAPABILITY_KEY_PATTERN.test(key),
                    );
                },
                message:
                    'Le format de clé de limite du plan est invalide.',
            },
        },


        /**
         * Utilisateur ayant créé le plan.
         *
         * null représente une création système, par exemple via seedPlans.js.
         * Un ObjectId sera utilisé lorsqu'un administrateur plateforme crée
         * explicitement l'offre.
         */
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },


        /**
         * Utilisateur responsable de la dernière modification.
         *
         * null représente une modification automatisée ou système.
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
 * Garantit la cohérence de la configuration commerciale du trial.
 *
 * Un plan sans trial ne doit conserver aucune durée résiduelle.
 * Un plan avec trial doit définir une durée entière strictement positive.
 */
planSchema.pre('validate', function validateTrialConfiguration() {
    if (!this.trialEnabled) {
        if (this.trialDurationDays !== null) {
            this.invalidate(
                'trialDurationDays',
                'La durée du trial doit être nulle lorsque le trial est désactivé.',
            );
        }

        return;
    }

    if (
        !Number.isInteger(this.trialDurationDays)
        || this.trialDurationDays <= 0
    ) {
        this.invalidate(
            'trialDurationDays',
            'La durée du trial doit être un entier strictement positif lorsque le trial est activé.',
        );
    }
});

/**
 * Garantit l'identité fonctionnelle unique d'un plan.
 *
 * `unique: true` sur le champ déclare déjà cet index auprès de Mongoose.
 * Nous ne redéclarons donc pas ici un second index identique.
 */


/**
 * Optimise la récupération du catalogue commercial.
 *
 * Une requête typique pourra rechercher les plans actifs et publics puis les
 * présenter dans l'ordre défini par la plateforme.
 */
planSchema.index({
    status: 1,
    isPublic: 1,
    displayOrder: 1,
});


/**
 * Facilite les listes administratives de plans classées chronologiquement
 * selon leur état actuel.
 */
planSchema.index({
    status: 1,
    createdAt: -1,
});


const Plan = model('Plan', planSchema);


export { Plan };