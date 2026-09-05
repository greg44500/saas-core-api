import { describe, expect, it } from 'vitest';

import {
  buildPlatformCapabilityGroups,
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
          metricKeys: ['price_history_entries_monthly'],
        },
        {
          key: 'ai_analysis',
          label: 'Analyse IA',
          category: 'ai',
          categoryLabel: 'Intelligence artificielle',
          displayOrder: 10,
          metricKeys: [],
        },
      ],
    });

    expect(groups).toEqual([
      expect.objectContaining({
        key: 'ai',
        label: 'Intelligence artificielle',
        items: [expect.objectContaining({
          key: 'ai_analysis',
          metricKeys: [],
        })],
      }),
      expect.objectContaining({
        key: 'products',
        label: 'Produits',
        items: [expect.objectContaining({
          key: 'price_history',
          metricKeys: ['price_history_entries_monthly'],
        })],
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
      metricKeys: [],
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

  it('attache les métriques à leur feature via metricKeys', () => {
    const [group] = buildPlatformCapabilityGroups({
      features: ['file_upload'],
      featureDefinitions: [
        {
          key: 'file_upload',
          label: 'Téléversement de fichiers',
          category: 'files',
          categoryLabel: 'Fichiers',
          metricKeys: [
            'storage_bytes',
            'file_uploads_monthly',
          ],
        },
      ],
      metrics: [
        {
          key: 'storage_bytes',
          presentation: {
            label: 'Stockage',
            category: 'files',
            categoryLabel: 'Fichiers',
          },
        },
        {
          key: 'file_uploads_monthly',
          presentation: {
            label: 'Téléversements mensuels',
            category: 'files',
            categoryLabel: 'Fichiers',
          },
        },
      ],
    });

    expect(group.features[0].metrics.map((metric) => metric.key)).toEqual([
      'storage_bytes',
      'file_uploads_monthly',
    ]);
    expect(group.metrics).toEqual([]);
  });

  it('distingue correctement deux features d’une même catégorie', () => {
    const [group] = buildPlatformCapabilityGroups({
      features: ['feature_a', 'feature_b'],
      featureDefinitions: [
        {
          key: 'feature_a',
          label: 'Fonction A',
          category: 'module',
          categoryLabel: 'Module',
          metricKeys: ['items_a'],
        },
        {
          key: 'feature_b',
          label: 'Fonction B',
          category: 'module',
          categoryLabel: 'Module',
          metricKeys: ['items_b'],
        },
      ],
      metrics: [
        {
          key: 'items_a',
          presentation: {
            label: 'Éléments A',
            category: 'module',
            categoryLabel: 'Module',
          },
        },
        {
          key: 'items_b',
          presentation: {
            label: 'Éléments B',
            category: 'module',
            categoryLabel: 'Module',
          },
        },
      ],
    });

    expect(group.features).toEqual([
      expect.objectContaining({
        key: 'feature_a',
        metrics: [expect.objectContaining({ key: 'items_a' })],
      }),
      expect.objectContaining({
        key: 'feature_b',
        metrics: [expect.objectContaining({ key: 'items_b' })],
      }),
    ]);
    expect(group.metrics).toEqual([]);
  });

  it('laisse une métrique non associée comme limite autonome', () => {
    const [group] = buildPlatformCapabilityGroups({
      features: ['feature_a'],
      featureDefinitions: [
        {
          key: 'feature_a',
          label: 'Fonction A',
          category: 'module',
          categoryLabel: 'Module',
          metricKeys: [],
        },
      ],
      metrics: [
        {
          key: 'workspace_capacity',
          presentation: {
            label: 'Capacité',
            category: 'module',
            categoryLabel: 'Module',
          },
        },
      ],
    });

    expect(group.features[0].metrics).toEqual([]);
    expect(group.metrics).toEqual([
      expect.objectContaining({ key: 'workspace_capacity' }),
    ]);
  });
});
