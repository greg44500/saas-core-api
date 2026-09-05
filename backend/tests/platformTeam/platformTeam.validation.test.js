import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    platformTeamMemberIdParamsSchema,
    updatePlatformTeamMemberRoleBodySchema,
} from '../../modules/platformTeam/platformTeam.validation.js';


describe('platformTeam validation', () => {
    it('accepte des ObjectId valides', () => {
        expect(platformTeamMemberIdParamsSchema.safeParse({
            memberId: '507f1f77bcf86cd799439011',
        }).success).toBe(true);

        expect(updatePlatformTeamMemberRoleBodySchema.safeParse({
            roleId: '507f191e810c19729de860ea',
        }).success).toBe(true);
    });

    it('refuse les identifiants invalides et les champs supplémentaires', () => {
        expect(platformTeamMemberIdParamsSchema.safeParse({
            memberId: 'not-an-object-id',
        }).success).toBe(false);

        expect(updatePlatformTeamMemberRoleBodySchema.safeParse({
            roleId: '507f191e810c19729de860ea',
            isFounder: true,
        }).success).toBe(false);
    });
});
