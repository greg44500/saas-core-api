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
    WORKSPACE_INVITATION_TOKEN_BYTES,
    WORKSPACE_INVITATION_TTL_DAYS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { Role } from '../role/role.model.js';
import { User } from '../users/user.model.js';
import {
    WorkspaceInvitation,
} from './workspaceInvitation.model.js';
import {
    WorkspaceMember,
} from '../workspaceMember/workspaceMember.model.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Produit la forme d'email utilisée comme identité fonctionnelle par le
 * backend. La validation syntaxique reste la responsabilité de Zod à la
 * frontière HTTP ; le service normalise également pour rester sûr lorsqu'il
 * est appelé depuis un autre contexte interne.
 */
const canonicalizeEmail = (email) => email.trim().toLowerCase();

const hashInvitationToken = (token) => crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

const generateInvitationToken = () => crypto
    .randomBytes(WORKSPACE_INVITATION_TOKEN_BYTES)
    .toString('hex');

/**
 * Ferme les invitations pending dont la fenêtre de sept jours est terminée.
 *
 * Cette normalisation est volontairement effectuée avant la création ou la
 * lecture. Elle évite qu'un ancien document pending bloque indéfiniment une
 * nouvelle invitation via l'index unique partiel.
 */
const expirePendingWorkspaceInvitations = async ({
    workspaceId,
    emailCanonical = null,
    now = new Date(),
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to expire workspace invitations',
        );
    }

    const filter = {
        workspace: workspaceId,
        status: WORKSPACE_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({
            $lte: now,
        }),
    };

    if (emailCanonical) {
        filter.emailCanonical = emailCanonical;
    }

    let query = WorkspaceInvitation.updateMany(
        filter,
        {
            $set: {
                status: WORKSPACE_INVITATION_STATUS.EXPIRED,
            },
        },
        {
            runValidators: true,
        },
    );

    if (session) {
        query = query.session(session);
    }

    return query;
};

/**
 * Crée une invitation temporaire à rejoindre un workspace.
 *
 * Le rôle owner est volontairement exclu : l'ownership est immuable dans la
 * V1 et ne peut donc être ni invité ni obtenu par une modification de rôle.
 *
 * @returns {Promise<{invitation: object, token: string}>}
 * Le token brut est retourné uniquement pour permettre au futur orchestrateur
 * email de le transmettre au destinataire. Il ne doit jamais être persisté ni
 * exposé dans les DTO de lecture.
 */
const createWorkspaceInvitation = async ({
    workspaceId,
    email,
    roleId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!workspaceId || !email || !roleId || !actorId) {
        throw new TypeError(
            'workspaceId, email, roleId and actorId are required to create a workspace invitation',
        );
    }

    const emailCanonical = canonicalizeEmail(email);

    return mongoose.connection.transaction(async (session) => {
        const role = await Role.findOne({
            _id: roleId,
            workspace: workspaceId,
        }).session(session);

        if (!role) {
            throw new AppError(
                'Rôle introuvable dans ce workspace.',
                404,
            );
        }

        /*
         * La clé système owner est une autorité de propriété, pas un simple
         * niveau de permissions administrables.
         */
        if (
            role.isSystem === true
            && role.key === SYSTEM_ROLE_KEY.OWNER
        ) {
            throw new AppError(
                'Le rôle owner ne peut pas être attribué par invitation.',
                400,
            );
        }

        const existingUser = await User.findOne({
            emailCanonical,
        })
            .select('_id')
            .session(session);

        if (existingUser) {
            const existingMembership =
                await WorkspaceMember.findOne({
                    workspace: workspaceId,
                    user: existingUser._id,
                }).session(session);

            if (
                existingMembership
                && existingMembership.status
                    !== WORKSPACE_MEMBER_STATUS.REMOVED
            ) {
                throw new AppError(
                    'Cet utilisateur appartient déjà à ce workspace.',
                    409,
                );
            }
        }

        await expirePendingWorkspaceInvitations({
            workspaceId,
            emailCanonical,
            now,
            session,
        });

        const pendingInvitation =
            await WorkspaceInvitation.findOne({
                workspace: workspaceId,
                emailCanonical,
                status:
                    WORKSPACE_INVITATION_STATUS.PENDING,
            }).session(session);

        if (pendingInvitation) {
            throw new AppError(
                'Une invitation active existe déjà pour cette adresse email.',
                409,
            );
        }

        const token = generateInvitationToken();
        const expiresAt = new Date(
            now.getTime()
            + WORKSPACE_INVITATION_TTL_DAYS * DAY_IN_MS,
        );

        let invitation;

        try {
            [invitation] = await WorkspaceInvitation.create(
                [
                    {
                        workspace: workspaceId,
                        emailCanonical,
                        role: roleId,
                        tokenHash: hashInvitationToken(token),
                        invitedBy: actorId,
                        expiresAt,
                    },
                ],
                { session },
            );
        } catch (error) {
            /*
             * L'index unique partiel reste l'ultime protection contre deux
             * créations concurrentes ayant passé les lectures précédentes.
             */
            if (error?.code === 11000) {
                throw new AppError(
                    'Une invitation active existe déjà pour cette adresse email.',
                    409,
                );
            }

            throw error;
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.MEMBER_INVITED,
                entityType:
                    AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                /*
                 * L'email n'est pas recopié dans l'audit : l'invitation reste
                 * la source de cette donnée personnelle.
                 */
                metadata: {
                    roleId: roleId.toString(),
                    expiresAt,
                },
            },
            { session },
        );

        return {
            invitation,
            token,
        };
    });
};

/**
 * Retourne les invitations encore actionnables d'un workspace.
 * Les invitations expirées sont d'abord normalisées afin que le frontend ne
 * reçoive jamais un document pending dont le délai est déjà dépassé.
 */
const listPendingWorkspaceInvitations = async ({
    workspaceId,
    page = 1,
    limit = 20,
    now = new Date(),
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to list workspace invitations',
        );
    }

    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError(
            'page must be an integer greater than or equal to 1',
        );
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new TypeError(
            'limit must be an integer between 1 and 100',
        );
    }

    await expirePendingWorkspaceInvitations({
        workspaceId,
        now,
    });

    const workspaceObjectId = new mongoose.Types.ObjectId(
        workspaceId.toString(),
    );
    const skip = (page - 1) * limit;

    const [result] = await WorkspaceInvitation.aggregate([
        {
            $match: {
                workspace: workspaceObjectId,
                status: WORKSPACE_INVITATION_STATUS.PENDING,
            },
        },
        {
            $lookup: {
                from: Role.collection.name,
                localField: 'role',
                foreignField: '_id',
                pipeline: [
                    {
                        $match: {
                            workspace: workspaceObjectId,
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            key: 1,
                            name: 1,
                        },
                    },
                ],
                as: 'role',
            },
        },
        {
            $unwind: '$role',
        },
        {
            $facet: {
                invitations: [
                    { $sort: { createdAt: -1, _id: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 0,
                            id: { $toString: '$_id' },
                            email: '$emailCanonical',
                            status: 1,
                            expiresAt: 1,
                            createdAt: 1,
                            role: {
                                id: { $toString: '$role._id' },
                                key: '$role.key',
                                name: '$role.name',
                            },
                        },
                    },
                ],
                metadata: [
                    { $count: 'total' },
                ],
            },
        },
    ]).exec();

    const invitations = result?.invitations ?? [];
    const total = result?.metadata?.[0]?.total ?? 0;

    return {
        invitations,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Révoque une invitation encore valide.
 *
 * Une invitation acceptée, expirée ou déjà révoquée est terminale et ne peut
 * pas être réutilisée. Une nouvelle invitation créera un nouveau secret.
 */
const revokeWorkspaceInvitation = async ({
    workspaceId,
    invitationId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!workspaceId || !invitationId || !actorId) {
        throw new TypeError(
            'workspaceId, invitationId and actorId are required to revoke a workspace invitation',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const invitation =
            await WorkspaceInvitation.findOneAndUpdate(
                {
                    _id: invitationId,
                    workspace: workspaceId,
                    status:
                        WORKSPACE_INVITATION_STATUS.PENDING,
                    expiresAt: mongoose.trusted({
                        $gt: now,
                    }),
                },
                {
                    $set: {
                        status:
                            WORKSPACE_INVITATION_STATUS.REVOKED,
                        revokedBy: actorId,
                        revokedAt: now,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

        if (!invitation) {
            const existingInvitation =
                await WorkspaceInvitation.findOne({
                    _id: invitationId,
                    workspace: workspaceId,
                }).session(session);

            if (!existingInvitation) {
                throw new AppError(
                    'Invitation introuvable dans ce workspace.',
                    404,
                );
            }

            throw new AppError(
                'Cette invitation n’est plus active.',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action:
                    AUDIT_ACTION.MEMBER_INVITATION_REVOKED,
                entityType:
                    AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
            },
            { session },
        );

        return invitation;
    });
};

export {
    createWorkspaceInvitation,
    expirePendingWorkspaceInvitations,
    listPendingWorkspaceInvitations,
    revokeWorkspaceInvitation,
};
