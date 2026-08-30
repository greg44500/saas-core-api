import crypto from 'node:crypto';

import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';
import {
    enforcePlanLimit,
} from '../plan/planLimit.service.js';
import { Role } from '../role/role.model.js';
import { User } from '../users/user.model.js';
import {
    WorkspaceMember,
} from '../workspaceMember/workspaceMember.model.js';
import {
    WorkspaceInvitation,
} from './workspaceInvitation.model.js';

const hashInvitationToken = (token) => crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

/**
 * Accepte une invitation pour l'utilisateur authentifié.
 *
 * L'opération est atomique : réservation de la capacité membre, création ou
 * réactivation du WorkspaceMember, clôture de l'invitation et AuditLog sont
 * validés ensemble. Aucun état partiel ne doit survivre à un échec.
 */
const acceptWorkspaceInvitation = async ({
    token,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!token || !actorId) {
        throw new TypeError(
            'token and actorId are required to accept a workspace invitation',
        );
    }

    const tokenHash = hashInvitationToken(token);

    return mongoose.connection.transaction(async (session) => {
        const actor = await User.findById(actorId)
            .select('_id emailCanonical')
            .session(session);

        if (!actor) {
            throw new AppError('Utilisateur introuvable.', 404);
        }

        const invitation = await WorkspaceInvitation.findOne({
            tokenHash,
            status: WORKSPACE_INVITATION_STATUS.PENDING,
            expiresAt: mongoose.trusted({ $gt: now }),
        }).session(session);

        if (!invitation) {
            throw new AppError(
                'Invitation invalide, expirée ou déjà utilisée.',
                409,
            );
        }

        if (actor.emailCanonical !== invitation.emailCanonical) {
            throw new AppError(
                'Cette invitation ne correspond pas à votre compte.',
                403,
            );
        }

        const role = await Role.findOne({
            _id: invitation.role,
            workspace: invitation.workspace,
        }).session(session);

        if (!role) {
            throw new AppError(
                'Le rôle associé à cette invitation n’existe plus.',
                409,
            );
        }

        /*
         * Même si la création d'invitation interdit déjà owner, ce contrôle
         * protège les anciennes données ou une modification manuelle de base.
         */
        if (
            role.isSystem === true
            && role.key === SYSTEM_ROLE_KEY.OWNER
        ) {
            throw new AppError(
                'Le rôle owner ne peut pas être attribué par invitation.',
                409,
            );
        }

        const existingMembership = await WorkspaceMember.findOne({
            workspace: invitation.workspace,
            user: actorId,
        }).session(session);

        if (
            existingMembership
            && existingMembership.status
                !== WORKSPACE_MEMBER_STATUS.REMOVED
        ) {
            throw new AppError(
                'Vous appartenez déjà à ce workspace.',
                409,
            );
        }

        /*
         * Une invitation ne consomme aucune place. La capacité est réservée
         * uniquement au moment où l'appartenance devient effective.
         */
        await enforcePlanLimit({
            workspaceId: invitation.workspace,
            metricKey: CORE_PLAN_METRIC.MEMBERS,
            amount: 1,
            actorId,
            at: now,
            session,
        });

        let membership;

        if (existingMembership) {
            existingMembership.status = WORKSPACE_MEMBER_STATUS.ACTIVE;
            existingMembership.role = role._id;
            existingMembership.updatedBy = actorId;

            /*
             * Le document existant reste la référence du membership réactivé.
             * La logique métier ne doit pas dépendre de la valeur retournée par
             * save(), notamment lorsque cette méthode est mockée en test.
             */
            await existingMembership.save({ session });
            membership = existingMembership;
        } else {
            [membership] = await WorkspaceMember.create(
                [
                    {
                        workspace: invitation.workspace,
                        user: actorId,
                        role: role._id,
                        status: WORKSPACE_MEMBER_STATUS.ACTIVE,
                        createdBy: actorId,
                        updatedBy: actorId,
                    },
                ],
                { session },
            );
        }

        invitation.status = WORKSPACE_INVITATION_STATUS.ACCEPTED;
        invitation.acceptedBy = actorId;
        invitation.acceptedAt = now;
        await invitation.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                workspace: invitation.workspace,
                action: AUDIT_ACTION.MEMBER_INVITATION_ACCEPTED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    membershipId: membership._id.toString(),
                    roleId: role._id.toString(),
                },
            },
            { session },
        );

        return {
            invitation,
            membership,
        };
    });
};

export { acceptWorkspaceInvitation };
