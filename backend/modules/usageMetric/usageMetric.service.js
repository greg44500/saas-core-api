import mongoose from 'mongoose';
import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';

import {
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
} from '../plan/planCapability.registry.js';
import {
    UsageMetric,
} from './usageMetric.model.js';


/**
 * Vérifie qu'une valeur représente une date JavaScript valide.
 *
 * Une instance Date peut exister tout en contenant une date invalide.
 * Le contrôle de getTime() évite d'utiliser une telle valeur dans les
 * calculs de périodes.
 *
 * @param {unknown} value
 * @returns {value is Date}
 */
const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());
/**
 * Identifie une collision sur un index unique MongoDB.
 *
 * Lors de deux initialisations concurrentes, les deux requêtes peuvent tenter
 * de créer la même UsageMetric. Une seule création réussit ; hors transaction,
 * l'autre peut relire le compteur créé par la requête concurrente.
 *
 * Dans une transaction, l'erreur ne doit pas être absorbée : une écriture en
 * erreur invalide la transaction courante et doit remonter à son gestionnaire.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
const isDuplicateKeyError = (error) =>
    error?.code === 11000;

/**
 * Détermine la fenêtre temporelle applicable à une métrique.
 *
 * La fonction consulte le registre injecté afin de ne pas déduire le
 * comportement d'une métrique depuis son nom.
 *
 * Les calculs mensuels sont réalisés en UTC pour éviter que le fuseau horaire
 * du serveur modifie les bornes de la période.
 *
 * La borne de début est incluse et la borne de fin est exclue :
 *
 * periodStart <= instant < periodEnd
 *
 * @param {object} params
 * @param {string} params.metricKey
 * @param {Date} [params.at]
 * @param {{
 *     getMetricDefinition: (
 *         metricKey: string
 *     ) => { periodType: string } | null
 * }} [params.registry]
 * @returns {{
 *     periodType: string,
 *     periodStart: Date | null,
 *     periodEnd: Date | null
 * }}
 */
const resolveUsageMetricPeriod = ({
    metricKey,
    at = new Date(),
    registry = DEFAULT_PLAN_CAPABILITY_REGISTRY,
}) => {
    if (
        typeof metricKey !== 'string'
        || metricKey.trim().length === 0
    ) {
        throw new TypeError(
            'metricKey is required to resolve a usage metric period',
        );
    }

    if (!isValidDate(at)) {
        throw new TypeError(
            'at must be a valid Date',
        );
    }

    if (
        !registry
        || typeof registry.getMetricDefinition !== 'function'
    ) {
        throw new TypeError(
            'registry must provide getMetricDefinition()',
        );
    }

    const normalizedMetricKey = metricKey.trim().toLowerCase();

    const metricDefinition =
        registry.getMetricDefinition(normalizedMetricKey);

    /*
     * Une métrique sans définition ne peut pas être mesurée correctement :
     * le service ignorerait s'il doit utiliser un état courant ou une période.
     */
    if (!metricDefinition) {
        throw new TypeError(
            `No usage metric definition found for "${normalizedMetricKey}"`,
        );
    }

    if (
        metricDefinition.periodType
        === USAGE_METRIC_PERIOD_TYPE.CURRENT
    ) {
        return {
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
            periodStart: null,
            periodEnd: null,
        };
    }

    if (
        metricDefinition.periodType
        === USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH
    ) {
        /*
         * Date.UTC produit des bornes stables indépendamment du fuseau
         * horaire de la machine qui exécute l'application.
         *
         * JavaScript gère automatiquement le passage de décembre à janvier
         * lorsque le mois suivant vaut 12.
         */
        const periodStart = new Date(
            Date.UTC(
                at.getUTCFullYear(),
                at.getUTCMonth(),
                1,
            ),
        );

        const periodEnd = new Date(
            Date.UTC(
                at.getUTCFullYear(),
                at.getUTCMonth() + 1,
                1,
            ),
        );

        return {
            periodType:
                USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
            periodStart,
            periodEnd,
        };
    }

    /*
     * Cette erreur révèle une définition de registre incohérente.
     * Il ne faut pas produire silencieusement une période arbitraire.
     */
    throw new TypeError(
        `Unsupported usage metric period type "${metricDefinition.periodType}"`,
    );
};
/**
 * Retourne la consommation d'un workspace pour une métrique et une date.
 *
 * La période n'est pas fournie directement par l'appelant. Elle est résolue
 * depuis la définition de la métrique afin d'éviter qu'une même metricKey
 * soit recherchée avec plusieurs conventions temporelles incompatibles.
 *
 * L'absence de document correspond à une consommation nulle. Cette situation
 * est normale lorsqu'un workspace n'a encore jamais utilisé la fonctionnalité
 * pendant la période concernée.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {string} params.metricKey
 * @param {Date} [params.at]
 * @param {{
 *     getMetricDefinition: (
 *         metricKey: string
 *     ) => { periodType: string } | null
 * }} [params.registry]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<number>}
 */
const getUsageMetricValue = async ({
    workspaceId,
    metricKey,
    at = new Date(),
    registry = DEFAULT_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to read a usage metric',
        );
    }

    /*
     * resolveUsageMetricPeriod valide également metricKey, la date et
     * l'interface du registre.
     */
    const {
        periodType,
        periodStart,
    } = resolveUsageMetricPeriod({
        metricKey,
        at,
        registry,
    });

    const normalizedMetricKey =
        metricKey.trim().toLowerCase();

    /*
     * periodType et periodStart correspondent aux champs de l'index unique
     * du modèle. Ils identifient précisément la mesure courante recherchée.
     */
    let query = UsageMetric.findOne({
        workspace: workspaceId,
        metricKey: normalizedMetricKey,
        periodType,
        periodStart,
    }).select('value');

    /*
     * La session reste facultative pour une simple lecture.
     * Elle pourra être transmise lorsque cette lecture participera à une
     * transaction plus large.
     */
    if (session) {
        query = query.session(session);
    }

    const usageMetric = await query.lean();

    return usageMetric?.value ?? 0;
};
/**
 * Incrémente atomiquement la consommation d'une métrique.
 *
 * Si aucun document n'existe encore pour le workspace et la période,
 * l'option upsert crée la mesure avec la valeur incrémentée.
 *
 * L'utilisation de $inc empêche la perte d'une consommation lorsque
 * plusieurs requêtes modifient simultanément le même compteur.
 *
 * Cette fonction enregistre une consommation. Elle n'applique pas encore
 * la limite du Plan : le futur enforcePlanLimit devra combiner le contrôle
 * du quota et sa réservation sans introduire de concurrence.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {string} params.metricKey
 * @param {number} [params.amount]
 * @param {Date} [params.at]
 * @param {string|import('mongoose').Types.ObjectId|null} [params.actorId]
 * @param {{
 *     getMetricDefinition: (
 *         metricKey: string
 *     ) => { periodType: string } | null
 * }} [params.registry]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<import('mongoose').Document>}
 */
const incrementUsageMetric = async ({
    workspaceId,
    metricKey,
    amount = 1,
    at = new Date(),
    actorId = null,
    registry = DEFAULT_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to increment a usage metric',
        );
    }

    /*
     * Cette fonction représente exclusivement une consommation positive.
     * Les corrections et diminutions nécessiteront une opération distincte
     * avec leurs propres règles de sécurité et d'audit.
     */
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new TypeError(
            'amount must be an integer greater than 0',
        );
    }

    const {
        periodType,
        periodStart,
        periodEnd,
    } = resolveUsageMetricPeriod({
        metricKey,
        at,
        registry,
    });

    const normalizedMetricKey =
        metricKey.trim().toLowerCase();

    const filter = {
        workspace: workspaceId,
        metricKey: normalizedMetricKey,
        periodType,
        periodStart,
    };

    const update = {
        /*
         * $inc est exécuté directement par MongoDB sur la valeur courante.
         * Aucune lecture préalable n'est nécessaire.
         */
        $inc: {
            value: amount,
        },

        /*
         * updatedBy est mis à jour à chaque consommation.
         * null représente une opération technique sans acteur humain.
         */
        $set: {
            updatedBy: actorId,
        },

        /*
         * Ces champs sont écrits uniquement lors de la création automatique
         * du document par upsert. Ils ne doivent pas modifier ultérieurement
         * l'identité ou les bornes d'une mesure existante.
         */
        $setOnInsert: {
            workspace: workspaceId,
            metricKey: normalizedMetricKey,
            periodType,
            periodStart,
            periodEnd,
            createdBy: actorId,
        },
    };

    const options = {
        upsert: true,

        /*
         * API moderne recommandée par Mongoose à la place de l'ancienne
         * option dépréciée new: true.
         */
        returnDocument: 'after',

        runValidators: true,
        setDefaultsOnInsert: true,
    };

    if (session) {
        options.session = session;
    }

    return UsageMetric.findOneAndUpdate(
        filter,
        update,
        options,
    );
};

/**
 * Réserve atomiquement une consommation sans dépasser la limite du plan.
 *
 * Pour une limite numérique, la condition est intégrée au filtre MongoDB :
 *
 * valeur actuelle <= limite - quantité demandée
 *
 * MongoDB vérifie cette condition et exécute $inc dans une même opération
 * atomique sur le document. Deux requêtes concurrentes ne peuvent donc pas
 * réserver la même capacité disponible.
 *
 * null représente une limite illimitée. Dans ce cas, l'incrément atomique
 * normal suffit puisqu'aucun plafond ne doit être contrôlé.
 *
 * La fonction retourne :
 * - le document mis à jour lorsque la réservation réussit ;
 * - null lorsque la capacité disponible est insuffisante.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {string} params.metricKey
 * @param {number | null} params.limit
 * @param {number} [params.amount]
 * @param {Date} [params.at]
 * @param {string|import('mongoose').Types.ObjectId|null} [params.actorId]
 * @param {{
 *     getMetricDefinition: (
 *         metricKey: string
 *     ) => { periodType: string } | null
 * }} [params.registry]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<import('mongoose').Document|null>}
 */
const reserveUsageMetricWithinLimit = async ({
    workspaceId,
    metricKey,
    limit,
    amount = 1,
    at = new Date(),
    actorId = null,
    registry = DEFAULT_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to reserve a usage metric',
        );
    }

    if (!Number.isInteger(amount) || amount <= 0) {
        throw new TypeError(
            'amount must be an integer greater than 0',
        );
    }

    if (
        limit !== null
        && (!Number.isInteger(limit) || limit < 0)
    ) {
        throw new TypeError(
            'limit must be null or a non-negative integer',
        );
    }

    /*
     * Une limite illimitée ne nécessite aucune condition supplémentaire.
     * incrementUsageMetric conserve malgré tout l'atomicité de l'incrément.
     */
    if (limit === null) {
        return incrementUsageMetric({
            workspaceId,
            metricKey,
            amount,
            at,
            actorId,
            registry,
            session,
        });
    }

    /*
     * Si la demande dépasse à elle seule la limite, aucune valeur actuelle
     * positive ou nulle ne peut rendre la réservation possible.
     *
     * Ce contrôle empêche aussi un upsert de créer accidentellement un compteur
     * supérieur à la limite lorsque le document n'existe pas encore.
     */
    if (amount > limit) {
        return null;
    }

    const {
        periodType,
        periodStart,
        periodEnd,
    } = resolveUsageMetricPeriod({
        metricKey,
        at,
        registry,
    });

    const normalizedMetricKey =
        metricKey.trim().toLowerCase();

    const identityFilter = {
        workspace: workspaceId,
        metricKey: normalizedMetricKey,
        periodType,
        periodStart,
    };

    /*
     * Le compteur est créé séparément de la condition de quota.
     *
     * Si la condition `value <= limite - quantité` était combinée avec
     * `upsert: true`, un compteur existant mais saturé ne correspondrait plus
     * au filtre. MongoDB tenterait alors d'insérer un second document portant
     * la même identité et provoquerait une erreur de clé dupliquée.
     */
    const initializationUpdate = {
        $setOnInsert: {
            workspace: workspaceId,
            metricKey: normalizedMetricKey,
            value: 0,
            periodType,
            periodStart,
            periodEnd,
            createdBy: actorId,
            updatedBy: actorId,
        },
    };

    const initializationOptions = {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
        setDefaultsOnInsert: true,
    };

    if (session) {
        initializationOptions.session = session;
    }

    try {
        await UsageMetric.findOneAndUpdate(
            identityFilter,
            initializationUpdate,
            initializationOptions,
        );
    } catch (error) {
        if (
            !isDuplicateKeyError(error)
            || session
        ) {
            throw error;
        }

        /*
         * Hors transaction, une création concurrente peut gagner entre la
         * recherche et l'upsert. Une lecture sans upsert récupère alors le
         * compteur désormais existant sans risquer une nouvelle insertion.
         */
        await UsageMetric.findOneAndUpdate(
            identityFilter,
            initializationUpdate,
            {
                ...initializationOptions,
                upsert: false,
            },
        );
    }

    /*
     * Exemple : limite 10 et réservation 3.
     * La valeur actuelle doit être inférieure ou égale à 7.
     */
    const boundedFilter = {
        ...identityFilter,

        /*
         * Cette condition est entièrement construite depuis une limite de plan
         * validée et une quantité entière validée par le backend.
         *
         * trusted() autorise uniquement ce sélecteur interne. sanitizeFilter reste
         * actif pour tous les filtres susceptibles de contenir des données non
         * fiables fournies par un client.
         */
        value: mongoose.trusted({
            $lte: limit - amount,
        }),
    };

    const update = {
        $inc: {
            value: amount,
        },
        $set: {
            updatedBy: actorId,
        },
        $setOnInsert: {
            workspace: workspaceId,
            metricKey: normalizedMetricKey,
            periodType,
            periodStart,
            periodEnd,
            createdBy: actorId,
        },
    };

    const options = {
        /*
         * Le compteur existe désormais. Une condition de quota non satisfaite
         * doit retourner null, jamais déclencher une tentative d'insertion.
         */
        upsert: false,
        returnDocument: 'after',
        runValidators: true,
        setDefaultsOnInsert: true,
    };

    if (session) {
        options.session = session;
    }

    return UsageMetric.findOneAndUpdate(
        boundedFilter,
        update,
        options,
    );
};
export {
    getUsageMetricValue,
    incrementUsageMetric,
    reserveUsageMetricWithinLimit,
    resolveUsageMetricPeriod,
};