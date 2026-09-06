import {
    listPlatformTeamMembers,
    reactivatePlatformTeamMember,
    revokePlatformTeamMember,
    suspendPlatformTeamMember,
    updatePlatformTeamMemberRole,
} from './platformTeam.service.js';
import {
    getPlatformTeamSummary,
} from './platformTeamSummary.service.js';


const toMemberDto = (member, roleOverride = null) => {
    const user = member.user && typeof member.user === 'object'
        && member.user.email !== undefined
        ? member.user
        : null;
    const role = roleOverride
        ?? (
            member.role && typeof member.role === 'object'
                && member.role.name !== undefined
                ? member.role
                : null
        );

    return {
        id: member._id.toString(),
        user: user
            ? {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                status: user.status,
            }
            : undefined,
        role: role
            ? {
                id: role._id.toString(),
                key: role.key,
                name: role.name,
                description: role.description,
                isSystem: role.isSystem,
            }
            : undefined,
        status: member.status,
        isFounder: member.isFounder === true,
        joinedAt: member.joinedAt,
        suspendedAt: member.suspendedAt,
        revokedAt: member.revokedAt,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
    };
};

const summary = async (_req, res) => {
    const teamSummary = await getPlatformTeamSummary();

    res.status(200).json({
        status: 'success',
        data: {
            summary: teamSummary,
        },
    });
};

const list = async (req, res) => {
    const { members, pagination } = await listPlatformTeamMembers({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: {
            members: members.map((member) => toMemberDto(member)),
        },
        meta: pagination,
    });
};

const updateRole = async (req, res) => {
    const { member, role } = await updatePlatformTeamMemberRole({
        memberId: req.validated.params.memberId,
        roleId: req.validated.body.roleId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: {
            member: toMemberDto(member, role),
        },
    });
};

const suspend = async (req, res) => {
    const { member, role } = await suspendPlatformTeamMember({
        memberId: req.validated.params.memberId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: {
            member: toMemberDto(member, role),
        },
    });
};

const reactivate = async (req, res) => {
    const { member, role } = await reactivatePlatformTeamMember({
        memberId: req.validated.params.memberId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: {
            member: toMemberDto(member, role),
        },
    });
};

const revoke = async (req, res) => {
    await revokePlatformTeamMember({
        memberId: req.validated.params.memberId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(204).send();
};


export {
    list,
    reactivate,
    revoke,
    summary,
    suspend,
    updateRole,
};
