import { z } from 'zod';


const mongoIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

const platformTeamMemberIdParamsSchema = z.strictObject({
    memberId: mongoIdSchema,
});

const updatePlatformTeamMemberRoleBodySchema = z.strictObject({
    roleId: mongoIdSchema,
});


export {
    platformTeamMemberIdParamsSchema,
    updatePlatformTeamMemberRoleBodySchema,
};
