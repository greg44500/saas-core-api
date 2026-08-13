import { describe, expect, it } from 'vitest';

import { buildPasswordResetEmail } from '../../../services/emailTemplates/passwordResetEmail.js';

describe('passwordResetEmail', () => {
    it('construit les versions texte et HTML avec les informations attendues', () => {
        const resetUrl =
            'http://localhost:5173/reset-password?token=test-token';

        const result = buildPasswordResetEmail({
            resetUrl,
            expiresInMinutes: 30,
        });

        expect(result.subject).toBe(
            'Réinitialisation de votre mot de passe',
        );

        // Le lien doit être présent dans les deux formats afin que l'email reste
        // utilisable même si le client de messagerie n'affiche pas le HTML.
        expect(result.text).toContain(resetUrl);
        expect(result.html).toContain(resetUrl);

        // La durée affichée doit correspondre à celle utilisée par le workflow
        // de création du token afin d'éviter une incohérence visible utilisateur.
        expect(result.text).toContain('30 minutes');
        expect(result.html).toContain('30 minutes');
    });

    it("échappe l'URL avant son insertion dans le HTML", () => {
        const resetUrl =
            'https://app.example.com/reset-password?token=abc&next="test"';

        const result = buildPasswordResetEmail({
            resetUrl,
            expiresInMinutes: 30,
        });

        // La version texte doit conserver l'URL exacte.
        expect(result.text).toContain(resetUrl);

        // La version HTML doit neutraliser les caractères capables de modifier
        // la structure de l'attribut href.
        expect(result.html).toContain(
            'https://app.example.com/reset-password?token=abc&amp;next=&quot;test&quot;',
        );
    });
});