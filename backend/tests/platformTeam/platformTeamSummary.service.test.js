import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../constants/platformTeam.constants.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import { PlatformTeamMember } from '../../modules/platformTeam/platformTeamMember.model.js';
import {
    getPlatformTeamSummary,
    percentageOf,
} from '../../modules/platformTeam/platformTeamSummary.service.js';

vi.mock('mongoose', () => ({
    default: {
        trusted: vi.fn((value) => value),
    },
}));
vi.mock('../../modules/platformTeam/platformTeamMember.model.js', () => ({
    PlatformTeamMember: {
        aggregate: vi.fn(),
    },
}));
vi.mock('../../modules/platformRole/platformRole.model.js', () => ({
    PlatformRole: {
        find: vi.fn(),
    },
}));

const roleQuery = (roles) => ({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(roles),
});


describe('getPlatformTeamSummary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('agrège les membres courants par statut et par rôle sans transformer Fondateur en rôle', async () => {
        const now = new Date('2026-09-06T11:00:00.000Z');
        const superAdminRoleId = {
            toString: () => '507f191e810c19729de860ea',
        };
        const supportRoleId = {
            toString: () => '507f191e810c19729de860eb',
        };

        PlatformTeamMember.aggregate.mockResolvedValue([
            {
                _id: {
                    role: superAdminRoleId,
                    status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                    isFounder: true,
                },
                count: 1,
            },
            {
                _id: {
                    role: supportRoleId,
                    status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                    isFounder: false,
                },
                count: 2,
            },
            {
                _id: {
                    role: supportRoleId,
                    status: PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
                    isFounder: false,
                },
                count: 1,
            },
        ]);
        PlatformRole.find.mockReturnValue(roleQuery([
            {
                _id: superAdminRoleId,
                key: 'super_admin',
                name: 'Super administrateur',
                isSystem: true,
            },
            {
                _id: supportRoleId,
                key: 'technical_support',
                name: 'Support technique',
                isSystem: true,
            },
        ]));

        const result = await getPlatformTeamSummary({ now });

        expect(mongoose.trusted).toHaveBeenCalledWith({
            $in: [
                PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
            ],
        });
        expect(result).toEqual({
            total: 4,
            active: 3,
            suspended: 1,
            founderCount: 1,
            byRole: [
                {
                    role: {
                        id: '507f191e810c19729de860eb',
                        key: 'technical_support',
                        name: 'Support technique',
                        isSystem: true,
                    },
                    total: 3,
                    active: 2,
                    suspended: 1,
                    percentage: 75,
                },
                {
                    role: {
                        id: '507f191e810c19729de860ea',
                        key: 'super_admin',
                        name: 'Super administrateur',
                        isSystem: true,
                    },
                    total: 1,
                    active: 1,
                    suspended: 0,
                    percentage: 25,
                },
            ],
            generatedAt: now,
        });
    });

    it('retourne un snapshot vide sans requête de rôles lorsqu’aucun membre courant n’existe', async () => {
        const now = new Date('2026-09-06T11:00:00.000Z');
        PlatformTeamMember.aggregate.mockResolvedValue([]);

        await expect(getPlatformTeamSummary({ now })).resolves.toEqual({
            total: 0,
            active: 0,
            suspended: 0,
            founderCount: 0,
            byRole: [],
            generatedAt: now,
        });

        expect(PlatformRole.find).not.toHaveBeenCalled();
    });

    it('conserve les effectifs même si un rôle référencé devient indisponible', async () => {
        const missingRoleId = {
            toString: () => '507f191e810c19729de860ec',
        };
        PlatformTeamMember.aggregate.mockResolvedValue([
            {
                _id: {
                    role: missingRoleId,
                    status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                    isFounder: false,
                },
                count: 1,
            },
        ]);
        PlatformRole.find.mockReturnValue(roleQuery([]));

        const result = await getPlatformTeamSummary();

        expect(result.total).toBe(1);
        expect(result.byRole).toEqual([
            {
                role: {
                    id: '507f191e810c19729de860ec',
                    key: null,
                    name: 'Rôle indisponible',
                    isSystem: null,
                },
                total: 1,
                active: 1,
                suspended: 0,
                percentage: 100,
            },
        ]);
    });

    it('calcule un pourcentage stable pour les répartitions du dashboard', () => {
        expect(percentageOf(3, 4)).toBe(75);
        expect(percentageOf(1, 3)).toBe(33);
        expect(percentageOf(0, 0)).toBe(0);
    });
});
