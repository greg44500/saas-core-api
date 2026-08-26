import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    WORKSPACE_STATUS,
} from '../../../constants/workspace.constants.js';

import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';

import {
    Workspace,
} from '../../workspace/workspace.model.js';

import {
    AppError,
} from '../../../utils/appError.js';


/**
 * Suspend administrativement un workspace actif.
 *
 * La modification du workspace et son AuditLog constituent une seule
 * opération transactionnelle afin qu'aucune suspension ne puisse être
 * enregistrée sans sa trace d'audit correspondante.
 *
 * Cette opération ne modifie volontairement ni les sessions des membres
 * ni la Subscription : le statut du workspace constitue une barrière
 * administrative indépendante de l'authentification et de la facturation.
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.actorId
 * @param {string} params.statusReason
 * @param {string|null} [params.statusReasonDetails]
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const suspendPlatformWorkspace = async ({
    workspaceId,
    actorId,
    statusReason,
    statusReasonDetails = null,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !workspaceId
        || !actorId
        || !statusReason
    ) {
        throw new TypeError(
            'workspaceId, actorId and statusReason are required '
            + 'to suspend a platform workspace',
        );
    }

    const now = new Date();

    let suspendedWorkspace;

    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Seul un workspace actif peut suivre la transition
             * ACTIVE → SUSPENDED.
             *
             * Le statut présent dans le filtre protège également
             * contre deux suspensions concurrentes du même workspace.
             */
            suspendedWorkspace =
                await Workspace.findOneAndUpdate(
                    {
                        _id: workspaceId,
                        status:
                            WORKSPACE_STATUS.ACTIVE,
                    },
                    {
                        $set: {
                            status:
                                WORKSPACE_STATUS.SUSPENDED,
                            statusReason,
                            statusReasonDetails,
                            statusChangedAt: now,
                            statusChangedBy: actorId,
                            updatedBy: actorId,
                        },
                    },
                    {
                        returnDocument: 'after',
                        runValidators: true,
                        session,
                    },
                );

            /*
             * findOneAndUpdate retourne null aussi bien lorsque
             * le workspace n'existe pas que lorsque son état
             * ne permet plus la transition demandée.
             *
             * Une seconde lecture permet de distinguer correctement
             * le 404 du conflit métier 409.
             */
            if (!suspendedWorkspace) {
                const existingWorkspace =
                    await Workspace.findById(
                        workspaceId,
                    )
                        .session(session);

                if (!existingWorkspace) {
                    throw new AppError(
                        'Workspace introuvable',
                        404,
                    );
                }

                throw new AppError(
                    'Ce workspace ne peut pas être suspendu dans son état actuel',
                    409,
                );
            }

            /*
             * La suspension et sa trace doivent être durables ensemble.
             * Tout échec d'écriture de l'AuditLog provoque donc
             * l'annulation transactionnelle du changement de statut.
             */
            await createAuditLog(
                {
                    actor: actorId,
                    workspace:
                        suspendedWorkspace._id,
                    action:
                        AUDIT_ACTION
                            .WORKSPACE_SUSPENDED,
                    entityType:
                        AUDIT_ENTITY_TYPE
                            .WORKSPACE,
                    entityId:
                        suspendedWorkspace._id,
                    status:
                        AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        statusReason,
                        statusReasonDetails,
                    },
                },
                {
                    session,
                },
            );
        },
    );

    return {
        id:
            suspendedWorkspace._id.toString(),
        status:
            suspendedWorkspace.status,
        statusReason:
            suspendedWorkspace.statusReason,
        statusReasonDetails:
            suspendedWorkspace
                .statusReasonDetails ?? null,
        statusChangedAt:
            suspendedWorkspace.statusChangedAt,
    };
};


export {
    suspendPlatformWorkspace,
};