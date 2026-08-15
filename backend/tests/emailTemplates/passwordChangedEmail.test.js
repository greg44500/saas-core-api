import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    buildPasswordChangedEmail,
} from '../../services/emailTemplates/passwordChangedEmail.js';


describe('passwordChangedEmail', () => {
    it('construit les versions texte et HTML avec le message de sécurité attendu', () => {
        const result =
            buildPasswordChangedEmail();

        expect(result.subject).toBe(
            'Votre mot de passe a été modifié',
        );

        /*
         * L'utilisateur doit être clairement informé
         * que son credential vient d'être modifié.
         */
        expect(result.text).toContain(
            'Le mot de passe de votre compte a été modifié.',
        );

        expect(result.html).toContain(
            'Le mot de passe de votre compte a été modifié.',
        );

        /*
         * Le reset-password révoque toutes les AuthSession.
         * Le message doit donc rester cohérent avec le comportement réel.
         */
        expect(result.text).toContain(
            'Toutes vos sessions actives ont été déconnectées',
        );

        expect(result.html).toContain(
            'Toutes vos sessions actives ont été déconnectées',
        );
    });


    it('ne contient aucune donnée sensible de réinitialisation', () => {
        const result =
            buildPasswordChangedEmail();

        /*
         * Cet email est une notification post-événement.
         *
         * Il ne doit jamais transporter de credential,
         * de token de reset ou de lien permettant de modifier le mot de passe.
         */
        expect(result.text).not.toContain(
            'reset-password',
        );

        expect(result.html).not.toContain(
            'reset-password',
        );

        expect(result.text).not.toContain(
            'token=',
        );

        expect(result.html).not.toContain(
            'token=',
        );
    });
});