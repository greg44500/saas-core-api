import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PlatformAccessSummary } from '@/features/platform/components/platform-access-summary';

afterEach(() => {
  cleanup();
});

describe('PlatformAccessSummary', () => {
  it('affiche séparément la qualité Fondateur et le rôle effectif dans le menu', () => {
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

  it('utilise Fondateur comme distinction principale sur le profil du Fondateur', () => {
    render(
      <PlatformAccessSummary
        mode="distinction"
        platformAccess={{
          isFounder: true,
          status: 'active',
          role: { name: 'Super administrateur' },
        }}
        variant="inline"
      />,
    );

    expect(screen.getByText('Fondateur')).toBeInTheDocument();
    expect(screen.queryByText('Super administrateur')).not.toBeInTheDocument();
  });

  it('utilise le rôle effectif comme distinction pour un autre membre Platform', () => {
    render(
      <PlatformAccessSummary
        mode="distinction"
        platformAccess={{
          isFounder: false,
          status: 'active',
          role: { name: 'Support technique' },
        }}
        variant="inline"
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
