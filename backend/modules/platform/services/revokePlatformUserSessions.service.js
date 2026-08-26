import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../constants/authSession.constants.js';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    revokeAllUserAuthSessions,
} from '../../authSessions/authSession.service.js';

import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';

import { User } from '../../users/user.model.js';

import { AppError } from '../../../utils/appError.js';


/**
 * Révoque administrativement toutes les sessions actives
 * d'un utilisateur de la plateforme.
 *
 * La révocation constitue l'action de sécurité prioritaire :
 * un échec ultérieur de l'AuditLog ne doit jamais restaurer
 * ou empêcher les sessions déjà révoquées.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const revokePlatformUserSessions = async ({
    userId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !actorId) {
        throw new TypeError(
            'userId and actorId are required '
            + 'to revoke platform user sessions',
        );
    }

    /*
     * On vérifie explicitement l'existence du compte.
     *
     * Sans ce contrôle, updateMany retournerait simplement
     * modifiedCount = 0 pour un User inexistant, ce qui
     * masquerait une cible administrative invalide.
     */
    const user = await User.findById(userId)
        .select('_id');

    if (!user) {
        throw new AppError(
            'Utilisateur introuvable',
            404,
        );
    }

    /*
     * ADMIN_REVOKED distingue clairement cette opération
     * d'un logout-all volontaire de l'utilisateur.
     */
    const revocationResult =
        await revokeAllUserAuthSessions({
            userId: user._id,
            revokedReason:
                AUTH_SESSION_REVOKED_REASON
                    .ADMIN_REVOKED,
        });

    /*
     * La sécurité prime ici sur la journalisation.
     *
     * Une erreur d'audit ne doit pas transformer une
     * révocation réussie en échec fonctionnel.
     */
    try {
        await createAuditLog({
            actor: actorId,
            action:
                AUDIT_ACTION.SESSION_REVOKED,
            entityType:
                AUDIT_ENTITY_TYPE.USER,
            entityId: user._id,
            status:
                AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                revokedReason:
                    AUTH_SESSION_REVOKED_REASON
                        .ADMIN_REVOKED,
                revokedSessionCount:
                    revocationResult.modifiedCount,
            },
        });
    } catch (error) {
        /*
         * Aucun détail sensible de session n'est journalisé
         * dans le fallback technique.
         */
        console.error(
            'Platform session revocation audit failed',
            {
                action:
                    AUDIT_ACTION.SESSION_REVOKED,
                errorName: error?.name,
            },
        );
    }

    return {
        userId: user._id.toString(),
        revokedSessionCount:
            revocationResult.modifiedCount,
    };
};


export {
    revokePlatformUserSessions,
};