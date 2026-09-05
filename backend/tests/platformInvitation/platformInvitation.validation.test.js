import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    acceptExistingPlatformInvitationBodySchema,
    acceptNewPlatformInvitationBodySchema,
    createPlatformInvitationBodySchema,
    platformInvitationIdParamsSchema,
} from '../../modules/platformInvitation/platformInvitation.validation.js';


const VALID_TOKEN = 'a'.repeat(64);
const VALID_ROLE_ID = '507f1f77bcf86cd799439011';


describe('platformInvitation.validation', () => {
    it('accepte une création strictement conforme', () => {
        const result = createPlatformInvitationBodySchema.parse({
            firstName: 'Marie',
            lastName: 'Martin',
            email: 'marie@example.com',
            roleId: VALID_ROLE_ID,
        });

        expect(result).toEqual({
            firstName: 'Marie',
            lastName: 'Martin',
            email: 'marie@example.com',
            roleId: VALID_ROLE_ID,
        });
    });

    it('refuse les champs administratifs injectés par le client', () => {
        expect(() => createPlatformInvitationBodySchema.parse({
            firstName: 'Marie',
            lastName: 'Martin',
            email: 'marie@example.com',
            roleId: VALID_ROLE_ID,
            status: 'accepted',
        })).toThrow();
    });

    it('refuse un roleId qui n’est pas un ObjectId', () => {
        expect(() => createPlatformInvitationBodySchema.parse({
            firstName: 'Marie',
            lastName: 'Martin',
            email: 'marie@example.com',
            roleId: 'admin',
        })).toThrow();
    });

    it('refuse un token qui ne correspond pas au secret hexadécimal attendu', () => {
        expect(() => acceptExistingPlatformInvitationBodySchema.parse({
            token: 'not-a-token',
        })).toThrow();
    });

    it('n’accepte que token et password pour créer un nouveau compte', () => {
        expect(
            acceptNewPlatformInvitationBodySchema.parse({
                token: VALID_TOKEN,
                password: 'un-mot-de-passe-tres-long',
            }),
        ).toEqual({
            token: VALID_TOKEN,
            password: 'un-mot-de-passe-tres-long',
        });

        expect(() => acceptNewPlatformInvitationBodySchema.parse({
            token: VALID_TOKEN,
            password: 'un-mot-de-passe-tres-long',
            email: 'other@example.com',
        })).toThrow();
    });

    it('valide strictement invitationId', () => {
        expect(
            platformInvitationIdParamsSchema.parse({
                invitationId: VALID_ROLE_ID,
            }),
        ).toEqual({ invitationId: VALID_ROLE_ID });

        expect(() => platformInvitationIdParamsSchema.parse({
            invitationId: 'bad-id',
        })).toThrow();
    });
});
