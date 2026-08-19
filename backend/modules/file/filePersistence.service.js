import mongoose from 'mongoose';

import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';

import {
    assertPlanFeatureAvailable,
} from '../plan/planFeature.service.js';

import {
    reservePlanLimitForEntitlement,
} from '../plan/planLimit.service.js';

import {
    getWorkspacePlanEntitlement,
} from '../subscriptions/subscription.service.js';

import { File } from './file.model.js';


/**
 * Vérifie qu'une date représente un instant valide.
 *
 * Le même instant doit être utilisé pour les deux réservations afin que les
 * métriques temporelles soient calculées dans une période cohérente.
 */
const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());


/**
 * Construit le service transactionnel responsable de la création des
 * métadonnées d'un fichier et de la réservation de ses quotas.
 *
 * Les dépendances sont injectées afin de tester l'ordre et l'atomicité logique
 * sans ouvrir une véritable transaction MongoDB dans les tests unitaires.
 */
const createFilePersistenceService = ({
    runTransaction,
    resolvePlanEntitlement,
    assertFeatureAvailable,
    reservePlanLimit,
    createFileDocuments,
}) => {
    if (
        typeof runTransaction !== 'function'
        || typeof resolvePlanEntitlement !== 'function'
        || typeof assertFeatureAvailable !== 'function'
        || typeof reservePlanLimit !== 'function'
        || typeof createFileDocuments !== 'function'
    ) {
        throw new TypeError(
            'Les dépendances du service de persistance File sont invalides.',
        );
    }

    /**
     * Réserve les quotas puis crée le document File dans une transaction.
     *
     * L'entitlement transmis par le middleware HTTP n'est volontairement pas
     * utilisé : il pourrait avoir changé entre le contrôle effectué avant
     * Multer et l'écriture finale. La souscription et le plan sont donc relus
     * dans le snapshot transactionnel.
     *
     * @param {object} parameters
     * @param {object} parameters.fileData
     * @param {Date} [parameters.at]
     * @returns {Promise<import('mongoose').Document>}
     */
    const persistFileMetadataWithinPlanLimits = async ({
        fileData,
        at = new Date(),
    }) => {
        if (
            !fileData
            || typeof fileData !== 'object'
            || !fileData.workspace
            || !fileData.uploadedBy
        ) {
            throw new TypeError(
                'Les métadonnées du fichier sont incomplètes.',
            );
        }

        if (
            !Number.isInteger(fileData.sizeBytes)
            || fileData.sizeBytes <= 0
        ) {
            throw new TypeError(
                'La taille du fichier doit être un entier strictement positif.',
            );
        }

        if (!isValidDate(at)) {
            throw new TypeError(
                'La date de réservation des quotas est invalide.',
            );
        }

        const workspaceId = fileData.workspace;
        const actorId = fileData.uploadedBy;

        return runTransaction(async (session) => {
            /*
             * Toutes les lectures et écritures d'autorité utilisent la même
             * session. Un refus ou une erreur après la première réservation
             * provoquera l'annulation des deux compteurs et du document File.
             */
            const planEntitlement =
                await resolvePlanEntitlement({
                    workspaceId,
                    session,
                });

            /*
             * Le middleware placé avant Multer évite les uploads inutiles,
             * mais cette seconde vérification protège l'écriture contre un
             * changement de plan intervenu pendant le traitement du fichier.
             */
            assertFeatureAvailable({
                plan: planEntitlement?.plan,
                featureKey:
                    CORE_PLAN_FEATURE.FILE_UPLOAD,
            });

            /*
             * Chaque fichier accepté consomme une unité du nombre mensuel
             * d'uploads, indépendamment de sa taille.
             */
            await reservePlanLimit({
                workspaceId,
                planEntitlement,
                metricKey:
                    CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY,
                amount: 1,
                at,
                actorId,
                session,
            });

            /*
             * Le stockage courant est mesuré avec la taille exacte inspectée
             * par le backend, jamais avec une valeur déclarée par le client.
             */
            await reservePlanLimit({
                workspaceId,
                planEntitlement,
                metricKey:
                    CORE_PLAN_METRIC.STORAGE_BYTES,
                amount: fileData.sizeBytes,
                at,
                actorId,
                session,
            });

            /*
             * Model.create reçoit un tableau afin que Mongoose applique
             * explicitement la session à cette création.
             */
            const createdFiles =
                await createFileDocuments(
                    [{ ...fileData }],
                    { session },
                );

            if (
                !Array.isArray(createdFiles)
                || !createdFiles[0]
            ) {
                throw new TypeError(
                    'La création du document File a retourné un résultat invalide.',
                );
            }

            return createdFiles[0];
        });
    };

    return Object.freeze({
        persistFileMetadataWithinPlanLimits,
    });
};


/**
 * Instance applicative utilisant une véritable transaction MongoDB.
 *
 * connection.transaction prend en charge l'ouverture, le commit, l'abandon
 * et les nouvelles tentatives prévues par le pilote pour certaines erreurs
 * transactionnelles transitoires.
 */
const filePersistenceService =
    createFilePersistenceService({
        runTransaction: (callback) =>
            mongoose.connection.transaction(callback),

        resolvePlanEntitlement: (parameters) =>
            getWorkspacePlanEntitlement(parameters),

        assertFeatureAvailable: (parameters) =>
            assertPlanFeatureAvailable(parameters),

        reservePlanLimit: (parameters) =>
            reservePlanLimitForEntitlement(parameters),

        createFileDocuments: (documents, options) =>
            File.create(documents, options),
    });


export {
    createFilePersistenceService,
    filePersistenceService,
};