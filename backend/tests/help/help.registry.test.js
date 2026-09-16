import { describe, expect, it } from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    HELP_CONTEXT,
    composeHelpModuleExtensions,
    createHelpRegistry,
} from '../../modules/help/help.registry.js';


const category = {
    id: 'workspace_test',
    context: HELP_CONTEXT.WORKSPACE,
    label: 'Test',
    description: 'Catégorie de test.',
    order: 10,
};

const entry = {
    id: 'workspace.test.read',
    context: HELP_CONTEXT.WORKSPACE,
    categoryId: category.id,
    title: 'Lire une ressource',
    summary: 'Résumé de test.',
    search: {
        keywords: ['lire'],
        questions: ['Comment lire ?'],
    },
    audience: {
        permissions: [CORE_PERMISSION.WORKSPACE_READ],
        ownerOnly: false,
    },
    requirements: {
        features: [],
    },
    whoCanPerform: 'Un membre autorisé.',
    prerequisites: [],
    steps: ['Ouvrez la ressource.'],
    outcome: 'La ressource est visible.',
    edgeCases: [],
    sensitiveConsequences: [],
    relatedEntryIds: [],
    order: 10,
};


describe('help.registry', () => {
    it('construit un registre immuable et valide', () => {
        const registry = createHelpRegistry({
            categories: [category],
            entries: [entry],
        });

        expect(registry.entries).toHaveLength(1);
        expect(Object.isFrozen(registry.entries)).toBe(true);
        expect(Object.isFrozen(registry.entries[0].search)).toBe(true);
    });

    it('refuse les identifiants de fiche dupliqués', () => {
        expect(() => createHelpRegistry({
            categories: [category],
            entries: [entry, entry],
        })).toThrow(/Duplicate help entry id/);
    });

    it('refuse une permission inconnue', () => {
        expect(() => createHelpRegistry({
            categories: [category],
            entries: [{
                ...entry,
                audience: {
                    permissions: ['workspace:unknown'],
                    ownerOnly: false,
                },
            }],
        })).toThrow(/unknown permission/);
    });

    it('refuse un lien lié inexistant', () => {
        expect(() => createHelpRegistry({
            categories: [category],
            entries: [{
                ...entry,
                relatedEntryIds: ['workspace.test.missing'],
            }],
        })).toThrow(/invalid related entry/);
    });

    it('refuse plus de cinq catégories dans un même contexte', () => {
        const categories = Array.from({ length: 6 }, (_, index) => ({
            ...category,
            id: `workspace_test_${index}`,
            order: index,
        }));

        expect(() => createHelpRegistry({
            categories,
            entries: [],
        })).toThrow(/more than 5 categories/);
    });

    it('compose explicitement les modules métier', () => {
        const extensions = composeHelpModuleExtensions([
            {
                key: 'catalog',
                categories: [category],
                entries: [entry],
            },
        ]);

        expect(extensions.categories).toHaveLength(1);
        expect(extensions.entries).toHaveLength(1);
    });
});
