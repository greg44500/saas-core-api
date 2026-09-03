import { describe, expect, it } from 'vitest';

import {
  buildPlatformFeatureGroups,
  buildPlatformMetricGroups,
} from '@/features/platform/lib/platform-capability-groups';


describe('platform capability groups', () => {
  it('regroupe les features métier selon les métadonnées du backend', () => {
    const groups = buildPlatformFeatureGroups({
      features: ['price_history', 'ai_analysis'],
      featureDefinitions: [
        {
          key: 'price_history',
          label: 'Historique des prix',
          category: 'products',
          categoryLabel: 'Produits',
          displayOrder: 20,
        },
        {
          key: 'ai_analysis',
          label: 'Analyse IA',
          category: 'ai',
          categoryLabel: 'Intelligence artificielle',
          displayOrder: 10,
        },
      ],
    });

    expect(groups).toEqual([
      expect.objectContaining({
        key: 'ai',
        label: 'Intelligence artificielle',
        items: [expect.objectContaining({ key: 'ai_analysis' })],
      }),
      expect.objectContaining({
        key: 'products',
        label: 'Produits',
        items: [expect.objectContaining({ key: 'price_history' })],
      }),
    ]);
  });

  it('ne montre jamais une définition absente de la liste des features actives', () => {
    const groups = buildPlatformFeatureGroups({
      features: ['file_upload'],
      featureDefinitions: [
        {
          key: 'ghost_feature',
          label: 'Feature fantôme',
          category: 'other',
          categoryLabel: 'Autres',
        },
      ],
    });

    expect(groups.flatMap((group) => group.items.map((item) => item.key)))
      .toEqual(['file_upload']);
  });

  it('conserve un fallback lisible pour une feature sans métadonnées', () => {
    const groups = buildPlatformFeatureGroups({
      features: ['supplier_comparison'],
    });

    expect(groups[0]).toEqual(expect.objectContaining({
      key: 'other',
      label: 'Autres',
    }));
    expect(groups[0].items[0]).toEqual(expect.objectContaining({
      key: 'supplier_comparison',
      label: 'Supplier comparison',
    }));
  });

  it('regroupe aussi les métriques à partir de leur présentation', () => {
    const groups = buildPlatformMetricGroups({
      metrics: [
        {
          key: 'products',
          definition: { periodType: 'current' },
          presentation: {
            label: 'Produits',
            category: 'products',
            categoryLabel: 'Produits',
            unit: 'count',
          },
        },
      ],
    });

    expect(groups[0].items[0]).toEqual(expect.objectContaining({
      key: 'products',
      label: 'Produits',
      unit: 'count',
    }));
  });
});
