import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
    getPlatformTeamSummary: vi.fn(),
}));

vi.mock('../../modules/platformTeam/platformTeam.service.js', () => ({
    listPlatformTeamMembers: vi.fn(),
    reactivatePlatformTeamMember: vi.fn(),
    revokePlatformTeamMember: vi.fn(),
    suspendPlatformTeamMember: vi.fn(),
    updatePlatformTeamMemberRole: vi.fn(),
}));
vi.mock('../../modules/platformTeam/platformTeamSummary.service.js', () => ({
    getPlatformTeamSummary: mocks.getPlatformTeamSummary,
}));

import {
    summary,
} from '../../modules/platformTeam/platformTeam.controller.js';


describe('platformTeam summary controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne uniquement le snapshot calculé par le service', async () => {
        const teamSummary = {
            total: 4,
            active: 3,
            suspended: 1,
            founderCount: 1,
            byRole: [],
            generatedAt: new Date('2026-09-06T11:00:00.000Z'),
        };
        mocks.getPlatformTeamSummary.mockResolvedValue(teamSummary);

        const status = vi.fn().mockReturnThis();
        const json = vi.fn();
        const res = { status, json };

        await summary({}, res);

        expect(mocks.getPlatformTeamSummary).toHaveBeenCalledOnce();
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({
            status: 'success',
            data: { summary: teamSummary },
        });
    });
});
