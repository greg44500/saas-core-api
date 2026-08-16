import mongoose from 'mongoose';

import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';


const { Schema, model } = mongoose;


/**
 * Vérifie qu'une consommation est représentée par un entier positif ou nul.
 *
 * Les métriques actuellement prévues représentent toutes des quantités
 * discrètes : membres, octets ou nombre d'uploads.
 */
const isNonNegativeInteger = (value) =>
    Number.isInteger(value) && value >= 0;


/**
 * Expression régulière commune aux clés fonctionnelles génériques.
 *
 * Le modèle contrôle seulement leur format. La vérification qu'une metricKey
 * existe réellement dans le registre des capabilities appartiendra au
 * futur UsageMetricService afin que les applications métier puissent injecter
 * leurs propres métriques.
 */
const METRIC_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;


/**
 * Représente la consommation mesurée d'un workspace.
 *
 * UsageMetric ne définit pas les limites commerciales : celles-ci sont
 * stockées dans Plan.
 *
 * Il mémorise uniquement la valeur consommée pour une métrique et, lorsque
 * cela s'applique, pour une période déterminée.
 */
const usageMetricSchema = new Schema(
    {
        /**
         * Workspace auquel appartient la consommation.
         *
         * Une mesure ne peut pas être transférée vers un autre workspace.
         */
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },


        /**
         * Clé fonctionnelle de la quantité mesurée.
         *
         * Exemples :
         * - members ;
         * - storage_bytes ;
         * - file_uploads_monthly.
         *
         * L'existence de cette clé dans le registre sera vérifiée par le
         * service, et non par le modèle, afin de préserver l'extensibilité
         * du socle SaaS.
         */
        metricKey: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            lowercase: true,
            minlength: 1,
            maxlength: 100,
            match: [
                METRIC_KEY_PATTERN,
                'La clé de métrique est invalide.',
            ],
        },


        /**
         * Valeur actuellement mesurée.
         *
         * La valeur peut augmenter ou diminuer pour une jauge courante,
         * tandis qu'un compteur périodique augmentera normalement pendant
         * sa période. Ces comportements seront contrôlés par le service.
         */
        value: {
            type: Number,
            required: true,
            default: 0,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'La valeur de consommation doit être un entier positif ou nul.',
            },
        },


        /**
         * Type de fenêtre temporelle associée à la mesure.
         *
         * Ce champ est immuable car une mesure courante ne doit pas devenir
         * ultérieurement une mesure mensuelle, ou inversement.
         */
        periodType: {
            type: String,
            enum: Object.values(USAGE_METRIC_PERIOD_TYPE),
            required: true,
            immutable: true,
        },


        /**
         * Début inclus de la période mesurée.
         *
         * Une métrique courante n'a aucune date de début.
         * Une métrique mensuelle doit obligatoirement en posséder une.
         */
        periodStart: {
            type: Date,
            default: null,
            immutable: true,
            required() {
                return (
                    this.periodType
                    === USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH
                );
            },
            validate: {
                validator(value) {
                    if (
                        this.periodType
                        === USAGE_METRIC_PERIOD_TYPE.CURRENT
                    ) {
                        return value === null;
                    }

                    return value instanceof Date
                        && !Number.isNaN(value.getTime());
                },
                message:
                    'Le début de période est incompatible avec le type de métrique.',
            },
        },


        /**
         * Fin exclue de la période mesurée.
         *
         * L'utilisation d'une borne de fin exclue évite qu'un même instant
         * appartienne à deux périodes consécutives.
         */
        periodEnd: {
            type: Date,
            default: null,
            immutable: true,
            required() {
                return (
                    this.periodType
                    === USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH
                );
            },
            validate: {
                validator(value) {
                    if (
                        this.periodType
                        === USAGE_METRIC_PERIOD_TYPE.CURRENT
                    ) {
                        return value === null;
                    }

                    return (
                        value instanceof Date
                        && !Number.isNaN(value.getTime())
                        && this.periodStart instanceof Date
                        && value > this.periodStart
                    );
                },
                message:
                    'La fin de période doit être postérieure au début de période.',
            },
        },


        /**
         * Utilisateur à l'origine de la création de la mesure.
         *
         * null est autorisé pour une initialisation ou une opération système.
         */
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },


        /**
         * Utilisateur à l'origine de la dernière modification.
         *
         * null est autorisé pour les incréments techniques automatiques.
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
 * Garantit une seule mesure pour un workspace, une clé et une période.
 *
 * Pour une mesure courante, periodStart vaut null :
 * un workspace ne peut donc avoir qu'un seul compteur courant par metricKey.
 *
 * Pour une mesure mensuelle, chaque début de mois crée une identité distincte,
 * ce qui permet de conserver l'historique.
 */
usageMetricSchema.index(
    {
        workspace: 1,
        metricKey: 1,
        periodType: 1,
        periodStart: 1,
    },
    {
        unique: true,
        name: 'unique_workspace_metric_period',
    },
);


/**
 * Accélère la lecture des consommations d'un workspace.
 *
 * Cette requête sera notamment utilisée par le futur contrôle des quotas et
 * par le dashboard de consommation.
 */
usageMetricSchema.index({
    workspace: 1,
    metricKey: 1,
});


const UsageMetric = model('UsageMetric', usageMetricSchema);


export { UsageMetric };