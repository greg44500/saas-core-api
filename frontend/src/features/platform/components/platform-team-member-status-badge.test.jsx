import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PlatformTeamMemberStatusBadge } from '@/features/platform/components/platform-team-member-status-badge';

describe('PlatformTeamMemberStatusBadge', () => {
  afterEach(() => cleanup());

  it.each([
    ['active', 'Actif', 'text-success'],
    ['suspended', 'Suspendu', 'text-warning'],
  ])('utilise le ton sémantique attendu pour %s', (status, label, expectedClass) => {
    render(<PlatformTeamMemberStatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveClass(expectedClass);
  });

  it('reste neutre pour un statut inconnu', () => {
    render(<PlatformTeamMemberStatusBadge status="unknown" />);

    expect(screen.getByText('unknown')).toHaveClass('text-muted-foreground');
  });
});
