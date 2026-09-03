import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';

import {
    assertEntitlementFeatureAvailable,
} from '../plan/planFeature.service.js';

import {
    reserveEffectiveLimitForEntitlement,
} from '../plan/planLimit.service.js';

import {
    getWorkspaceEffectiveEntitlement,
} from '../subscriptions/subscription.service.js';

import {
    createAuditLog,
} from '../auditLog/auditLog.service.js';

import { File } from './file.model.js';


/**
 * Vérifie qu'une date représente un instant valide.
 *
 * Le même instant doit être utilisé pour la résolution commerciale et les deux
 * réservations afin qu'un override ou une métrique temporelle ne change pas de
 * période au milieu d'une seule décision transactionnelle.
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
    resolveEffectiveEntitlement,
    assertFeatureAvailable,
    reserveEffectiveLimit,
    createFileDocuments,
    createAuditEvent,
}) => {
    if (
        typeof runTransaction !== 'function'
        || typeof resolveEffectiveEntitlement !== 'function'
        || typeof assertFeatureAvailable !== 'function'
        || typeof reserveEffectiveLimit !== 'function'
        || typeof createFileDocuments !== 'function'
        || typeof createAuditEvent !== 'function'
    ) {
        throw new TypeError(
            'Les dépendances du service de persistance File sont invalides.',
        );
    }

    /**
     * Réserve les quotas puis crée le document File dans une transaction.
     *
     * L'entitlement lu avant Multer n'est volontairement pas réutilisé : une
     * Subscription ou un EntitlementOverride peut changer pendant l'inspection
     * et le stockage physique. L'autorité est donc relue dans le snapshot
     * transactionnel juste avant les écritures MongoDB.
     *
     * @param {object} parameters
     * @param {object} parameters.fileData
     * @param {Date} [parameters.at]
     * @param {string|null} [parameters.ipAddress]
     * @param {string|null} [parameters.userAgent]
     * @returns {Promise<import('mongoose').Document>}
     */
    const persistFileMetadataWithinPlanLimits = async ({
        fileData,
        at = new Date(),
        ipAddress = null,
        userAgent = null,
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
            const effectiveEntitlement =
                await resolveEffectiveEntitlement({
                    workspaceId,
                    at,
                    session,
                });

            /*
             * Le middleware placé avant Multer évite les uploads inutiles,
             * mais cette seconde vérification protège l'écriture contre une
             * modification de Plan ou d'override pendant le traitement.
             */
            assertFeatureAvailable({
                entitlement: effectiveEntitlement,
                featureKey:
                    CORE_PLAN_FEATURE.FILE_UPLOAD,
            });

            /*
             * Chaque fichier accepté consomme une unité du nombre mensuel
             * d'uploads, indépendamment de sa taille. La limite utilisée est
             * celle de l'entitlement effectif au même instant `at`.
             */
            await reserveEffectiveLimit({
                workspaceId,
                effectiveEntitlement,
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
            await reserveEffectiveLimit({
                workspaceId,
                effectiveEntitlement,
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
                || !createdFiles[0]?._id
            ) {
                throw new TypeError(
                    'La création du document File a retourné un résultat invalide.',
                );
            }
            const createdFile = createdFiles[0];

            /*
             * Les quotas, le document File et sa trace doivent être validés
             * ou annulés ensemble.
             */
            await createAuditEvent(
                {
                    actor: actorId,
                    workspace: workspaceId,
                    action: AUDIT_ACTION.FILE_UPLOADED,
                    entityType: AUDIT_ENTITY_TYPE.FILE,
                    entityId: createdFile._id,
                    status: AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        sizeBytes: fileData.sizeBytes,
                    },
                },
                {
                    session,
                },
            );

            return createdFile;
        });
    };

    return Object.freeze({
        persistFileMetadataWithinPlanLimits,
    });
};


/**
 * Instance applicative utilisant une véritable transaction MongoDB.
 *
 * `connection.transaction` prend en charge l'ouverture, le commit, l'abandon
 * et les nouvelles tentatives prévues par le pilote pour certaines erreurs
 * transactionnelles transitoires.
 */
const filePersistenceService =
    createFilePersistenceService({
        runTransaction: (callback) =>
            mongoose.connection.transaction(callback),

        resolveEffectiveEntitlement: (parameters) =>
            getWorkspaceEffectiveEntitlement(parameters),

        assertFeatureAvailable: (parameters) =>
            assertEntitlementFeatureAvailable(parameters),

        reserveEffectiveLimit: (parameters) =>
            reserveEffectiveLimitForEntitlement(parameters),

        createFileDocuments: (documents, options) =>
            File.create(documents, options),

        createAuditEvent: (auditData, options) =>
            createAuditLog(auditData, options),
    });


export {
    createFilePersistenceService,
    filePersistenceService,
};