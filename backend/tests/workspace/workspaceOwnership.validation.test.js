import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    transferWorkspaceOwnershipBodySchema,
} from '../../modules/workspace/workspaceOwnership.validation.js';


describe('transferWorkspaceOwnershipBodySchema', () => {
    it('accepte deux ObjectId valides', () => {
        const result = transferWorkspaceOwnershipBodySchema.parse({
            newOwnerMemberId:
                '507f1f77bcf86cd799439011',
            previousOwnerRoleId:
                '507f191e810c19729de860ea',
        });

        expect(result).toEqual({
            newOwnerMemberId:
                '507f1f77bcf86cd799439011',
            previousOwnerRoleId:
                '507f191e810c19729de860ea',
        });
    });

    it('refuse un identifiant invalide', () => {
        expect(() =>
            transferWorkspaceOwnershipBodySchema.parse({
                newOwnerMemberId: 'invalid',
                previousOwnerRoleId:
                    '507f191e810c19729de860ea',
            })).toThrow();
    });

    it('refuse les champs inconnus', () => {
        expect(() =>
            transferWorkspaceOwnershipBodySchema.parse({
                newOwnerMemberId:
                    '507f1f77bcf86cd799439011',
                previousOwnerRoleId:
                    '507f191e810c19729de860ea',
                workspaceId:
                    '507f1f77bcf86cd799439012',
            })).toThrow();
    });
});
