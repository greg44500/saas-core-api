import mongoose from 'mongoose';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    DISCOUNT_TYPE,
    SUBSCRIPTION_PLAN_CHANGE_TYPE,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_KIND,
} from '../../constants/subscription.constants.js';

const { Schema, model } = mongoose;

const isNonNegativeInteger = (value) =>
    Number.isInteger(value) && value >= 0;

const CURRENT_PERIOD_END_VALIDATION_MESSAGE =
    'La fin de période doit être postérieure au début de période.';
const TRIAL_END_VALIDATION_MESSAGE =
    'La fin de l’essai doit être postérieure au début de période.';

const TEMPORAL_PATHS = Object.freeze([
    'currentPeriodStart',
    'currentPeriodEnd',
    'trialEndsAt',
]);

const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object ?? {}, key);

/**
 * Retourne le début de période visible par le contexte de validation.
 *
 * Un document Mongoose et une Query exposent tous deux `get()`, mais une Query
 * ne connaît que les valeurs présentes dans l'update. L'absence de valeur est
 * donc volontairement acceptée ici : le middleware `findOneAndUpdate` ci-dessous
 * complète ensuite l'invariant avec l'état réellement persisté.
 */
const getValidationCurrentPeriodStart = (context) => {
    if (typeof context?.get === 'function') {
        return context.get('currentPeriodStart');
    }

    return context?.currentPeriodStart;
};

const updateTouchesPath = (update, path) =>
    hasOwn(update, path)
    || hasOwn(update?.$set, path)
    || hasOwn(update?.$unset, path);

const getMergedUpdateValue = ({ query, update, path, persistedValue }) => {
    if (hasOwn(update?.$unset, path)) {
        return null;
    }

    if (hasOwn(update, path) || hasOwn(update?.$set, path)) {
        return query.get(path);
    }

    return persistedValue;
};

const addValidatorError = ({ validationError, path, value, message }) => {
    validationError.addError(
        path,
        new mongoose.Error.ValidatorError({
            path,
            value,
            message,
        }),
    );
};

/**
 * Décrit une modification commerciale déjà demandée mais qui ne doit devenir
 * effective qu'à une échéance future.
 *
 * Le snapshot du prix et de la devise est conservé avec l'intention afin
 * qu'une modification ultérieure du catalogue ne change pas silencieusement
 * les conditions du downgrade déjà programmé.
 */
const scheduledChangeSchema = new Schema(
    {
        type: {
            type: String,
            enum: Object.values(SUBSCRIPTION_PLAN_CHANGE_TYPE),
            required: true,
        },
        targetPlan: {
            type: Schema.Types.ObjectId,
            ref: 'Plan',
            required: true,
        },
        targetBillingInterval: {
            type: String,
            enum: Object.values(BILLING_INTERVAL),
            required: true,
        },
        targetCurrency: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            minlength: 3,
            maxlength: 3,
            match: [/^[A-Z]{3}$/, 'Le code devise du changement programmé est invalide.'],
        },
        targetPriceExclTaxMinor: {
            type: Number,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'Le prix HT du changement programmé doit être un entier positif ou nul.',
            },
        },
        effectiveAt: {
            type: Date,
            required: true,
        },
        requestedAt: {
            type: Date,
            required: true,
        },
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        _id: false,
    },
);

/**
 * Représente l'abonnement réel d'un workspace à une offre commerciale.
 *
 * Plan décrit le catalogue ; Subscription conserve l'état contractuel et les
 * snapshots acceptés. La consommation réelle appartient à UsageMetric et les
 * montants effectivement encaissés appartiendront au futur domaine Billing.
 */
const subscriptionSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        plan: {
            type: Schema.Types.ObjectId,
            ref: 'Plan',
            required: true,
        },
        kind: {
            type: String,
            enum: Object.values(SUBSCRIPTION_KIND),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(SUBSCRIPTION_STATUS),
            default: SUBSCRIPTION_STATUS.ACTIVE,
            required: true,
        },
        currentPeriodStart: {
            type: Date,
            default: Date.now,
            required: true,
        },
        currentPeriodEnd: {
            type: Date,
            default: null,
            validate: {
                validator: function validateCurrentPeriodEnd(value) {
                    const currentPeriodStart =
                        getValidationCurrentPeriodStart(this);

                    return (
                        value === null
                        || currentPeriodStart == null
                        || value > currentPeriodStart
                    );
                },
                message: CURRENT_PERIOD_END_VALIDATION_MESSAGE,
            },
        },
        trialEndsAt: {
            type: Date,
            default: null,
            validate: {
                validator: function validateTrialEnd(value) {
                    const currentPeriodStart =
                        getValidationCurrentPeriodStart(this);

                    return (
                        value === null
                        || currentPeriodStart == null
                        || value > currentPeriodStart
                    );
                },
                message: TRIAL_END_VALIDATION_MESSAGE,
            },
        },
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false,
            required: true,
        },

        /**
         * Une seule intention future peut exister à la fois sur la Subscription.
         * null signifie qu'aucun changement de plan n'est programmé.
         *
         * Une annulation en fin de période reste séparée dans
         * `cancelAtPeriodEnd` : une annulation et un downgrade ne portent pas la
         * même intention métier et ne doivent jamais être confondus.
         */
        scheduledChange: {
            type: scheduledChangeSchema,
            default: null,
        },

        billingInterval: {
            type: String,
            enum: Object.values(BILLING_INTERVAL),
            default: BILLING_INTERVAL.NONE,
            required: true,
        },
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
        priceExclTaxMinor: {
            type: Number,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'Le prix HT de la souscription doit être un entier positif ou nul.',
            },
        },
        provider: {
            type: String,
            enum: Object.values(BILLING_PROVIDER),
            default: BILLING_PROVIDER.MANUAL,
            required: true,
        },
        providerCustomerId: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },
        providerSubscriptionId: {
            type: String,
            trim: true,
            maxlength: 255,
            default: null,
        },
        discountType: {
            type: String,
            enum: Object.values(DISCOUNT_TYPE),
            default: DISCOUNT_TYPE.NONE,
            required: true,
        },
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
        discountReason: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        discountEndsAt: {
            type: Date,
            default: null,
        },
        manualOverride: {
            type: Boolean,
            default: false,
            required: true,
        },
        manualOverrideReason: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        manualOverrideBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },
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
 * Les update validators Mongoose ne s'exécutent que sur les chemins modifiés et
 * `this` y représente une Query. Une comparaison inter-champs portée seulement
 * par `currentPeriodEnd` ou `trialEndsAt` ne peut donc pas voir de façon fiable
 * un `currentPeriodStart` déjà stocké.
 *
 * Ce garde complète uniquement les opérations ayant explicitement demandé
 * `runValidators: true`. Il recharge les trois dates quand l'une d'elles change,
 * fusionne l'état persisté avec l'update puis vérifie l'invariant complet. Les
 * services conservent ainsi leurs mises à jour atomiques sans transformer les
 * bornes contractuelles en validation partielle.
 */
subscriptionSchema.pre('findOneAndUpdate', async function validateTemporalUpdate() {
    if (this.getOptions().runValidators !== true) {
        return;
    }

    const update = this.getUpdate() ?? {};
    const touchesTemporalInvariant = TEMPORAL_PATHS.some((path) =>
        updateTouchesPath(update, path));

    if (!touchesTemporalInvariant) {
        return;
    }

    let persistedQuery = this.model
        .findOne(this.getQuery())
        .select('currentPeriodStart currentPeriodEnd trialEndsAt');

    const session = this.getOptions().session;
    if (session) {
        persistedQuery = persistedQuery.session(session);
    }

    const persisted = await persistedQuery.lean();

    // Une query sans document correspondant n'écrira rien ; les validateurs
    // standards restent responsables d'un éventuel upsert explicitement demandé.
    if (!persisted) {
        return;
    }

    const currentPeriodStart = getMergedUpdateValue({
        query: this,
        update,
        path: 'currentPeriodStart',
        persistedValue: persisted.currentPeriodStart,
    });
    const currentPeriodEnd = getMergedUpdateValue({
        query: this,
        update,
        path: 'currentPeriodEnd',
        persistedValue: persisted.currentPeriodEnd,
    });
    const trialEndsAt = getMergedUpdateValue({
        query: this,
        update,
        path: 'trialEndsAt',
        persistedValue: persisted.trialEndsAt,
    });

    const validationError = new mongoose.Error.ValidationError();

    if (
        currentPeriodStart != null
        && currentPeriodEnd != null
        && currentPeriodEnd <= currentPeriodStart
    ) {
        addValidatorError({
            validationError,
            path: 'currentPeriodEnd',
            value: currentPeriodEnd,
            message: CURRENT_PERIOD_END_VALIDATION_MESSAGE,
        });
    }

    if (
        currentPeriodStart != null
        && trialEndsAt != null
        && trialEndsAt <= currentPeriodStart
    ) {
        addValidatorError({
            validationError,
            path: 'trialEndsAt',
            value: trialEndsAt,
            message: TRIAL_END_VALIDATION_MESSAGE,
        });
    }

    if (Object.keys(validationError.errors).length > 0) {
        throw validationError;
    }
});

/**
 * Garantit qu'un workspace ne possède qu'une seule souscription courante de
 * chaque rôle fonctionnel.
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

subscriptionSchema.index({
    plan: 1,
    status: 1,
});

subscriptionSchema.index({
    kind: 1,
    status: 1,
    trialEndsAt: 1,
});

subscriptionSchema.index({
    provider: 1,
    providerSubscriptionId: 1,
});

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
