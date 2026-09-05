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
import {
    assertUserIsNotPlatformFounder,
    isPlatformFounder,
} from '../../modules/platformTeam/platformFounderPolicy.service.js';
import {
    PlatformTeamMember,
} from '../../modules/platformTeam/platformTeamMember.model.js';

vi.mock('mongoose', () => ({
    default: {
        trusted: vi.fn((value) => value),
    },
}));

vi.mock('../../modules/platformTeam/platformTeamMember.model.js', () => ({
    PlatformTeamMember: {
        exists: vi.fn(),
    },
}));

const queryResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
    then(resolve, reject) {
        return Promise.resolve(value).then(resolve, reject);
    },
});


describe('platformFounderPolicy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('recherche le Fondateur avec un opérateur interne explicitement trusted', async () => {
        PlatformTeamMember.exists.mockReturnValue(
            queryResult({ _id: 'founder-membership-id' }),
        );

        const result = await isPlatformFounder({
            userId: 'founder-user-id',
        });

        expect(result).toBe(true);
        expect(mongoose.trusted).toHaveBeenCalledWith({
            $in: [
                PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
            ],
        });
        expect(PlatformTeamMember.exists).toHaveBeenCalledWith({
            user: 'founder-user-id',
            isFounder: true,
            status: {
                $in: [
                    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
                ],
            },
        });
    });

    it('refuse une opération ordinaire visant le Fondateur', async () => {
        PlatformTeamMember.exists.mockReturnValue(
            queryResult({ _id: 'founder-membership-id' }),
        );

        await expect(
            assertUserIsNotPlatformFounder({
                userId: 'founder-user-id',
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('autorise la politique à poursuivre pour un User non Fondateur', async () => {
        PlatformTeamMember.exists.mockReturnValue(queryResult(null));

        await expect(
            assertUserIsNotPlatformFounder({
                userId: 'normal-user-id',
            }),
        ).resolves.toBeUndefined();
    });
});
