import { beforeEach, describe, expect, it, vi } from 'vitest';

import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { User } from '../../modules/users/user.model.js';
import { updateCurrentUserProfile } from '../../modules/users/user.service.js';

vi.mock('mongoose', () => ({
    default: {
        connection: {
            transaction: vi.fn(),
        },
        trusted: vi.fn((value) => value),
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findOneAndUpdate: vi.fn(),
    },
}));

describe('updateCurrentUserProfile', () => {
    const session = { id: 'session' };

    beforeEach(() => {
        vi.clearAllMocks();
        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('met à jour uniquement les champs fournis et écrit un audit sans valeur personnelle', async () => {
        const user = {
            _id: 'user-id',
            firstName: 'Gregory',
            lastName: 'Ballat',
        };
        User.findOneAndUpdate.mockResolvedValue(user);
        createAuditLog.mockResolvedValue({});

        const result = await updateCurrentUserProfile({
            userId: 'user-id',
            firstName: 'Gregory',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });

        expect(result).toBe(user);
        expect(User.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ _id: 'user-id' }),
            {
                $set: {
                    firstName: 'Gregory',
                    updatedBy: 'user-id',
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: 'user-id',
                action: AUDIT_ACTION.USER_PROFILE_UPDATED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: 'user-id',
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'Test Browser',
                metadata: {
                    changedFields: ['firstName'],
                },
            },
            { session },
        );

        const auditPayload = createAuditLog.mock.calls[0][0];
        expect(auditPayload.metadata).not.toHaveProperty('firstName');
        expect(auditPayload.metadata).not.toHaveProperty('lastName');
    });

    it('refuse un appel de service sans champ de profil', async () => {
        await expect(
            updateCurrentUserProfile({ userId: 'user-id' }),
        ).rejects.toThrow('at least one profile field is required');

        expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    });

    it('refuse la mise à jour si le compte devient indisponible', async () => {
        User.findOneAndUpdate.mockResolvedValue(null);

        await expect(
            updateCurrentUserProfile({
                userId: 'user-id',
                lastName: 'Nouveau nom',
            }),
        ).rejects.toMatchObject({
            message: 'Compte indisponible',
            statusCode: 403,
        });

        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
