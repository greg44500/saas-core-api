import { describe, expect, it } from 'vitest';

import {
    PASSWORD_POLICY,
    evaluatePasswordStrength,
    getPublicPasswordPolicy,
    validateNewPasswordAgainstPolicy,
} from '../../shared/security/passwordPolicy.js';

describe('passwordPolicy', () => {
    it('expose une politique publique cohérente avec la source canonique', () => {
        const publicPolicy = getPublicPasswordPolicy();

        expect(publicPolicy.version).toBe(PASSWORD_POLICY.version);
        expect(publicPolicy.minLength).toBe(15);
        expect(publicPolicy.maxLength).toBe(128);
        expect(publicPolicy.levels.map(({ key }) => key)).toEqual([
            'weak',
            'good',
            'strong',
        ]);
        expect(publicPolicy.rejection).toEqual(
            expect.objectContaining({
                minimumSequenceLength: 6,
                repeatedCharacterMinimum: 6,
                weakTerms: expect.arrayContaining([
                    'password',
                    'motdepasse',
                    'azerty',
                ]),
                knownSequences: expect.arrayContaining([
                    '1234567890',
                    'abcdefghijklmnopqrstuvwxyz',
                    'azertyuiop',
                ]),
            }),
        );
    });

    it.each([
        ['password123456789', 'common_weak_password'],
        ['P@ssw0rd-2026-super', 'common_weak_password'],
        ['123456789012345', 'trivial_sequence'],
        ['abcdefghijklmno', 'trivial_sequence'],
        ['aaaaaaaaaaaaaaa', 'repeated_pattern'],
        ['azertyuiopazerty', 'trivial_sequence'],
    ])('refuse %s comme mot de passe prévisible', (password, expectedReason) => {
        const result = validateNewPasswordAgainstPolicy(password);

        expect(result.valid).toBe(false);
        expect(result.reasons).toContain(expectedReason);
    });

    it('accepte une phrase de passe longue non triviale', () => {
        const result = validateNewPasswordAgainstPolicy(
            'Velo bleu sous la pluie, dimanche 47!',
        );

        expect(result.valid).toBe(true);
        expect(result.reasons).toEqual([]);
    });

    it('classe la robustesse selon les seuils de la politique backend', () => {
        expect(evaluatePasswordStrength('aaaaaaaaaaaaaaa').key).toBe('weak');
        expect(
            evaluatePasswordStrength('Phrase longue et unique 47!').key,
        ).not.toBe('weak');
        expect(
            evaluatePasswordStrength('Phrase beaucoup plus longue, Unique 47! & difficile à deviner').key,
        ).toBe('strong');
    });
});
