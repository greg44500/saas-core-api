import mongoose from 'mongoose';

import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../constants/platformTeam.constants.js';
import { PlatformRole } from '../platformRole/platformRole.model.js';
import { PlatformTeamMember } from './platformTeamMember.model.js';


const CURRENT_PLATFORM_TEAM_MEMBER_STATUSES = Object.freeze([
    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
]);

const emptyRoleCounters = () => ({
    total: 0,
    active: 0,
    suspended: 0,
});

const getPlatformTeamSummary = async ({ now = new Date() } = {}) => {
    const groupedMemberships = await PlatformTeamMember.aggregate([
        {
            $match: {
                status: mongoose.trusted({
                    $in: CURRENT_PLATFORM_TEAM_MEMBER_STATUSES,
                }),
            },
        },
        {
            $group: {
                _id: {
                    role: '$role',
                    status: '$status',
                    isFounder: '$isFounder',
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const roleIds = [
        ...new Map(
            groupedMemberships
                .filter((entry) => entry?._id?.role)
                .map((entry) => [
                    entry._id.role.toString(),
                    entry._id.role,
                ]),
        ).values(),
    ];

    const roles = roleIds.length > 0
        ? await PlatformRole.find({
            _id: mongoose.trusted({ $in: roleIds }),
        })
            .select('key name isSystem')
            .lean()
        : [];

    const roleById = new Map(
        roles.map((role) => [role._id.toString(), role]),
    );
    const roleCounters = new Map();
    const summary = {
        total: 0,
        active: 0,
        suspended: 0,
        founderCount: 0,
        byRole: [],
        generatedAt: now,
    };

    groupedMemberships.forEach((entry) => {
        const count = Number(entry.count) || 0;
        const status = entry?._id?.status;
        const roleId = entry?._id?.role?.toString() ?? null;

        summary.total += count;

        if (status === PLATFORM_TEAM_MEMBER_STATUS.ACTIVE) {
            summary.active += count;
        }

        if (status === PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED) {
            summary.suspended += count;
        }

        if (entry?._id?.isFounder === true) {
            summary.founderCount += count;
        }

        if (!roleId) return;

        if (!roleCounters.has(roleId)) {
            roleCounters.set(roleId, emptyRoleCounters());
        }

        const counters = roleCounters.get(roleId);
        counters.total += count;

        if (status === PLATFORM_TEAM_MEMBER_STATUS.ACTIVE) {
            counters.active += count;
        }

        if (status === PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED) {
            counters.suspended += count;
        }
    });

    summary.byRole = [...roleCounters.entries()]
        .map(([roleId, counters]) => {
            const role = roleById.get(roleId);

            return {
                role: {
                    id: roleId,
                    key: role?.key ?? null,
                    name: role?.name ?? 'Rôle indisponible',
                    isSystem: role?.isSystem ?? null,
                },
                ...counters,
            };
        })
        .sort((left, right) => (
            right.total - left.total
            || left.role.name.localeCompare(right.role.name, 'fr')
        ));

    return summary;
};


export {
    CURRENT_PLATFORM_TEAM_MEMBER_STATUSES,
    getPlatformTeamSummary,
};
