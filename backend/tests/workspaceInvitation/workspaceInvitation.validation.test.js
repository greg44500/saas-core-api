import { describe, expect, it } from 'vitest';

import {
    acceptNewWorkspaceInvitationBodySchema,
} from '../../modules/workspaceInvitation/workspaceInvitation.validation.js';

const validPayload = {
    token: 'a'.repeat(64),
    firstName: 'Marie',
    lastName: 'Martin',
    password: 'Phrase unique pour workspace 47!',
    legalAccepted: true,
};

describe('acceptNewWorkspaceInvitationBodySchema', () => {
    it('accepte uniquement le profil minimal attendu pour créer le compte invité', () => {
        expect(
            acceptNewWorkspaceInvitationBodySchema.safeParse(validPayload).success,
        ).toBe(true);
    });

    it('refuse une acceptation juridique absente ou fausse', () => {
        expect(
            acceptNewWorkspaceInvitationBodySchema.safeParse({
                ...validPayload,
                legalAccepted: false,
            }).success,
        ).toBe(false);

        const { legalAccepted: _legalAccepted, ...withoutLegalAcceptance } =
            validPayload;

        expect(
            acceptNewWorkspaceInvitationBodySchema.safeParse(
                withoutLegalAcceptance,
            ).success,
        ).toBe(false);
    });

    it('refuse un profil incomplet et un mot de passe prévisible', () => {
        expect(
            acceptNewWorkspaceInvitationBodySchema.safeParse({
                ...validPayload,
                firstName: '',
            }).success,
        ).toBe(false);

        expect(
            acceptNewWorkspaceInvitationBodySchema.safeParse({
                ...validPayload,
                password: 'Password123456!',
            }).success,
        ).toBe(false);
    });

    it('refuse tout champ client non prévu, notamment un email substitué', () => {
        expect(
            acceptNewWorkspaceInvitationBodySchema.safeParse({
                ...validPayload,
                email: 'other@example.com',
            }).success,
        ).toBe(false);
    });
});
