import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    acceptCommercialInvitationBodySchema,
    commercialInvitationIdParamsSchema,
    createCommercialInvitationBodySchema,
    previewCommercialInvitationBodySchema,
    revokeCommercialInvitationBodySchema,
} from '../../modules/commercialInvitation/commercialInvitation.validation.js';

const VALID_TOKEN = 'a'.repeat(64);
const VALID_ID = '507f1f77bcf86cd799439011';

describe('commercialInvitation.validation', () => {
    it('accepte une création qui référence uniquement une offre existante', () => {
        expect(createCommercialInvitationBodySchema.parse({
            email: 'beta@example.com',
            planId: VALID_ID,
            workspaceName: 'Beta Workspace',
            billingInterval: 'none',
            reason: 'Programme beta septembre',
        })).toEqual({
            email: 'beta@example.com',
            planId: VALID_ID,
            workspaceName: 'Beta Workspace',
            billingInterval: 'none',
            reason: 'Programme beta septembre',
        });
    });

    it('exige une justification de l’accès privé', () => {
        expect(() => createCommercialInvitationBodySchema.parse({
            email: 'beta@example.com',
            planId: VALID_ID,
            workspaceName: 'Beta Workspace',
            billingInterval: 'none',
        })).toThrow();
    });

    it('refuse toute capability ou condition contractuelle injectée par le client', () => {
        const basePayload = {
            email: 'beta@example.com',
            planId: VALID_ID,
            workspaceName: 'Beta Workspace',
            billingInterval: 'none',
            reason: 'Programme beta septembre',
        };

        expect(() => createCommercialInvitationBodySchema.parse({
            ...basePayload,
            features: ['file_upload'],
        })).toThrow();

        expect(() => createCommercialInvitationBodySchema.parse({
            ...basePayload,
            termType: 'open_ended',
        })).toThrow();
    });

    it('valide strictement les tokens preview et accept', () => {
        expect(previewCommercialInvitationBodySchema.parse({
            token: VALID_TOKEN,
        })).toEqual({ token: VALID_TOKEN });

        expect(acceptCommercialInvitationBodySchema.parse({
            token: VALID_TOKEN,
        })).toEqual({ token: VALID_TOKEN });

        expect(() => acceptCommercialInvitationBodySchema.parse({
            token: 'bad-token',
        })).toThrow();
    });

    it('exige un motif explicite de révocation', () => {
        expect(revokeCommercialInvitationBodySchema.parse({
            reason: 'Offre retirée',
        })).toEqual({ reason: 'Offre retirée' });

        expect(() => revokeCommercialInvitationBodySchema.parse({
            reason: '',
        })).toThrow();
    });

    it('valide strictement invitationId', () => {
        expect(commercialInvitationIdParamsSchema.parse({
            invitationId: VALID_ID,
        })).toEqual({ invitationId: VALID_ID });

        expect(() => commercialInvitationIdParamsSchema.parse({
            invitationId: 'bad-id',
        })).toThrow();
    });
});
