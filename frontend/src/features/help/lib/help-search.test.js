import { describe, expect, it } from 'vitest';

import {
  normalizeHelpSearchValue,
  searchHelpEntries,
} from '@/features/help/lib/help-search';

const entries = [
  {
    id: 'workspace.members.invite',
    title: 'Inviter un membre dans le workspace',
    summary: 'Envoyer une invitation temporaire.',
    search: {
      keywords: ['invitation', 'équipe', 'ajouter'],
      questions: ['Comment ajouter un utilisateur à mon workspace ?'],
    },
    order: 20,
  },
  {
    id: 'workspace.files.upload',
    title: 'Téléverser un fichier',
    summary: 'Ajouter un document autorisé.',
    search: {
      keywords: ['fichier', 'upload', 'document'],
      questions: ['Comment ajouter un fichier ?'],
    },
    order: 10,
  },
  {
    id: 'workspace.activity.read',
    title: 'Consulter l’activité du workspace',
    summary: 'Lire l’historique des actions auditées.',
    search: {
      keywords: ['audit', 'historique'],
      questions: ['Où consulter les actions réalisées ?'],
    },
    order: 30,
  },
];

describe('help-search', () => {
  it('normalise la casse, les accents et les espaces', () => {
    expect(normalizeHelpSearchValue('  TÉLÉVERSER   un Fichier ')).toBe(
      'televerser un fichier',
    );
  });

  it('priorise le titre puis les questions et mots-clés', () => {
    expect(searchHelpEntries(entries, 'téléverser')[0].id).toBe(
      'workspace.files.upload',
    );
    expect(searchHelpEntries(entries, 'utilisateur')[0].id).toBe(
      'workspace.members.invite',
    );
    expect(searchHelpEntries(entries, 'audit')[0].id).toBe(
      'workspace.activity.read',
    );
  });

  it('ne recherche que dans le catalogue fourni et respecte la limite', () => {
    const manyEntries = Array.from({ length: 8 }, (_, index) => ({
      ...entries[0],
      id: `workspace.test.${index}`,
      title: `Aide invitation ${index}`,
      order: index,
    }));

    const results = searchHelpEntries(manyEntries, 'invitation', 5);

    expect(results).toHaveLength(5);
    expect(results.every(({ id }) => id.startsWith('workspace.test.'))).toBe(true);
  });

  it('retourne une liste vide sans requête exploitable', () => {
    expect(searchHelpEntries(entries, '   ')).toEqual([]);
  });
});
