import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PlatformClientUserDistribution,
  formatUserCount,
} from '@/features/platform/components/platform-client-user-distribution';

const DISTRIBUTIONS = {
  accountStatus: {
    active: { count: 6, percentage: 75 },
    disabled: { count: 1, percentage: 12.5 },
    deletionRequested: { count: 1, percentage: 12.5 },
  },
  access: {
    active: { count: 7, percentage: 87.5 },
    suspendedOnly: { count: 1, percentage: 12.5 },
  },
  relationship: {
    owner: { count: 3, percentage: 37.5 },
    withoutOwnership: { count: 5, percentage: 62.5 },
  },
};

describe('PlatformClientUserDistribution', () => {
  it('affiche les trois facettes calculées par le backend', () => {
    render(<PlatformClientUserDistribution distributions={DISTRIBUTIONS} />);

    const accountStatus = screen.getByRole('group', {
      name: 'Répartition des utilisateurs clients par état du compte',
    });
    const access = screen.getByRole('group', {
      name: 'Répartition des utilisateurs clients par état d’accès',
    });
    const relationship = screen.getByRole('group', {
      name: 'Répartition des utilisateurs clients selon la propriété des espaces',
    });

    expect(within(accountStatus).getByText('Comptes actifs')).toBeInTheDocument();
    expect(within(accountStatus).getByText('6 utilisateurs · 75 %')).toBeInTheDocument();
    expect(within(access).getByText('Accès suspendus uniquement')).toBeInTheDocument();
    expect(within(access).getByText('1 utilisateur · 12,5 %')).toBeInTheDocument();
    expect(within(relationship).getByText('Propriétaires d’au moins un espace')).toBeInTheDocument();
    expect(within(relationship).getByText('3 utilisateurs · 37,5 %')).toBeInTheDocument();
  });

  it('conserve toutes les catégories visibles et affiche un tiret lorsque la valeur vaut zéro', () => {
    render(<PlatformClientUserDistribution distributions={{}} />);

    expect(screen.getByText('Comptes actifs')).toBeInTheDocument();
    expect(screen.getByText('Comptes désactivés')).toBeInTheDocument();
    expect(screen.getByText('Suppression demandée')).toBeInTheDocument();
    expect(screen.getByText('Au moins un accès actif')).toBeInTheDocument();
    expect(screen.getByText('Accès suspendus uniquement')).toBeInTheDocument();
    expect(screen.getByText('Propriétaires d’au moins un espace')).toBeInTheDocument();
    expect(screen.getByText('Membres sans propriété d’espace')).toBeInTheDocument();
    expect(screen.getAllByText('— · 0 %')).toHaveLength(7);
  });

  it('formate les quantités sans afficher zéro', () => {
    expect(formatUserCount({ value: 0 })).toBe('—');
    expect(formatUserCount({ value: 1 })).toBe('1 utilisateur');
    expect(formatUserCount({ value: 2 })).toBe('2 utilisateurs');
  });
});
