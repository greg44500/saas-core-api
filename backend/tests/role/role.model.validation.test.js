import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { Role } from '../../modules/role/role.model.js';

const buildRole = (permissions) => new Role({
    workspace: new mongoose.Types.ObjectId(),
    key: 'custom-role',
    name: 'Custom role',
    permissions,
    isSystem: false,
    isEditable: true,
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
});

describe('Role permission validation', () => {
    it('accepte une permission standard à deux segments', async () => {
        await expect(
            buildRole(['workspace:read']).validate(),
        ).resolves.toBeUndefined();
    });

    it('accepte une permission hiérarchique à trois segments', async () => {
        await expect(
            buildRole(['workspace:ownership:transfer']).validate(),
        ).resolves.toBeUndefined();
    });

    it('normalise les permissions en minuscules avant validation', async () => {
        const role = buildRole(['workspace:Read']);

        await expect(role.validate()).resolves.toBeUndefined();
        expect(role.permissions).toEqual(['workspace:read']);
    });

    it.each([
        'workspace',
        ':read',
        'workspace:',
        'workspace::read',
        'workspace:ownership transfer',
    ])('refuse le format invalide %s', async (permission) => {
        await expect(
            buildRole([permission]).validate(),
        ).rejects.toMatchObject({
            errors: {
                'permissions.0': expect.objectContaining({
                    message: 'Le format de la permission est invalide.',
                }),
            },
        });
    });
});
