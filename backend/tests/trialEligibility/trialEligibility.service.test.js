import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    TrialEligibility,
} from '../../modules/trialEligibility/trialEligibility.model.js';

import {
    createTrialIdentityFingerprint,
    hasConsumedTrial,
    recordTrialConsumption,
} from '../../modules/trialEligibility/trialEligibility.service.js';


vi.mock(
    '../../modules/trialEligibility/trialEligibility.model.js',
    () => ({
        TrialEligibility: {
            exists: vi.fn(),
            create: vi.fn(),
        },
    }),
);


describe('trialEligibility.service', () => {
    const emailCanonical =
        'user@example.com';

    const session = {
        id: 'mongo-session',
    };


    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('produit toujours la même empreinte pour une même identité canonique', () => {
        const firstFingerprint =
            createTrialIdentityFingerprint(
                emailCanonical,
            );

        const secondFingerprint =
            createTrialIdentityFingerprint(
                emailCanonical,
            );

        expect(
            firstFingerprint,
        ).toBe(secondFingerprint);

        expect(
            firstFingerprint,
        ).toHaveLength(64);
    });


    it('produit des empreintes différentes pour deux identités différentes', () => {
        const firstFingerprint =
            createTrialIdentityFingerprint(
                'first@example.com',
            );

        const secondFingerprint =
            createTrialIdentityFingerprint(
                'second@example.com',
            );

        expect(
            firstFingerprint,
        ).not.toBe(secondFingerprint);
    });


    it('ne conserve pas directement l’adresse email dans l’empreinte', () => {
        const fingerprint =
            createTrialIdentityFingerprint(
                emailCanonical,
            );

        expect(
            fingerprint,
        ).not.toContain(emailCanonical);

        expect(
            fingerprint,
        ).toMatch(/^[a-f\d]{64}$/);
    });


    it('indique qu’une identité a déjà consommé un trial', async () => {
        const query = {
            session: vi.fn()
                .mockReturnThis(),
        };

        TrialEligibility.exists
            .mockReturnValue(query);

        query.then = (resolve) =>
            Promise.resolve({
                _id: 'trial-id',
            }).then(resolve);

        const result =
            await hasConsumedTrial({
                emailCanonical,
            });

        expect(result).toBe(true);

        expect(
            TrialEligibility.exists,
        ).toHaveBeenCalledWith({
            identityFingerprint:
                createTrialIdentityFingerprint(
                    emailCanonical,
                ),
        });
    });


    it('indique qu’une identité n’a jamais consommé de trial', async () => {
        const query = {
            session: vi.fn()
                .mockReturnThis(),
        };

        TrialEligibility.exists
            .mockReturnValue(query);

        query.then = (resolve) =>
            Promise.resolve(null)
                .then(resolve);

        const result =
            await hasConsumedTrial({
                emailCanonical,
            });

        expect(result).toBe(false);
    });


    it('transmet la session lors de la vérification d’éligibilité', async () => {
        const query = {
            session: vi.fn()
                .mockReturnThis(),
        };

        TrialEligibility.exists
            .mockReturnValue(query);

        query.then = (resolve) =>
            Promise.resolve(null)
                .then(resolve);

        await hasConsumedTrial({
            emailCanonical,
            session,
        });

        expect(
            query.session,
        ).toHaveBeenCalledWith(
            session,
        );
    });


    it('enregistre durablement la consommation du trial dans la transaction', async () => {
        const recordedTrial = {
            _id: 'trial-id',
        };

        TrialEligibility.create
            .mockResolvedValue([
                recordedTrial,
            ]);

        const result =
            await recordTrialConsumption({
                emailCanonical,
                userId: 'user-id',
                workspaceId: 'workspace-id',
                subscriptionId:
                    'subscription-id',
                session,
            });

        expect(
            TrialEligibility.create,
        ).toHaveBeenCalledWith(
            [
                {
                    identityFingerprint:
                        createTrialIdentityFingerprint(
                            emailCanonical,
                        ),
                    firstUser:
                        'user-id',
                    firstWorkspace:
                        'workspace-id',
                    firstSubscription:
                        'subscription-id',
                    consumedAt:
                        expect.any(Date),
                },
            ],
            {
                session,
            },
        );

        expect(result).toBe(
            recordedTrial,
        );
    });
});