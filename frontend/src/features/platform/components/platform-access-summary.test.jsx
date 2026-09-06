import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PlatformAccessSummary } from '@/features/platform/components/platform-access-summary';

afterEach(() => {
  cleanup();
});

describe('PlatformAccessSummary', () => {
  it('affiche séparément la qualité Fondateur et le rôle effectif', () => {
    render(
      <PlatformAccessSummary
        platformAccess={{
          isFounder: true,
          status: 'active',
          role: { name: 'Super administrateur' },
        }}
      />,
    );

    expect(screen.getByText('Fondateur')).toBeInTheDocument();
    expect(screen.getByText('Super administrateur')).toBeInTheDocument();
  });

  it('permet de réutiliser uniquement la distinction dans un affichage inline', () => {
    render(
      <PlatformAccessSummary
        label="Profil :"
        platformAccess={{
          isFounder: true,
          status: 'active',
          role: { name: 'Super administrateur' },
        }}
        showRole={false}
        variant="inline"
      />,
    );

    expect(screen.getByText('Profil :')).toBeInTheDocument();
    expect(screen.getByText('Fondateur')).toBeInTheDocument();
    expect(screen.queryByText('Super administrateur')).not.toBeInTheDocument();
  });

  it('n’affiche pas Fondateur pour un autre membre Platform', () => {
    render(
      <PlatformAccessSummary
        platformAccess={{
          isFounder: false,
          status: 'active',
          role: { name: 'Support technique' },
        }}
      />,
    );

    expect(screen.queryByText('Fondateur')).not.toBeInTheDocument();
    expect(screen.getByText('Support technique')).toBeInTheDocument();
  });

  it('rend explicite un accès Platform suspendu', () => {
    render(
      <PlatformAccessSummary
        platformAccess={{
          isFounder: false,
          status: 'suspended',
          role: { name: 'Support client' },
        }}
      />,
    );

    expect(screen.getByText('Support client')).toBeInTheDocument();
    expect(screen.getByText('Accès suspendu')).toBeInTheDocument();
  });

  it('ne rend rien sans contexte Platform', () => {
    const { container } = render(
      <PlatformAccessSummary platformAccess={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
