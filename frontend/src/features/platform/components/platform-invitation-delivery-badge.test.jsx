import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PlatformInvitationDeliveryBadge } from '@/features/platform/components/platform-invitation-delivery-badge';

describe('PlatformInvitationDeliveryBadge', () => {
  afterEach(() => cleanup());

  it.each([
    ['pending', 'Envoi en attente', 'text-warning'],
    ['sent', 'Envoyée', 'text-success'],
    ['failed', 'Échec d’envoi', 'text-destructive'],
  ])('utilise le ton sémantique attendu pour %s', (status, label, expectedClass) => {
    render(<PlatformInvitationDeliveryBadge status={status} />);

    expect(screen.getByText(label)).toHaveClass(expectedClass);
  });

  it('reste neutre pour un statut inconnu', () => {
    render(<PlatformInvitationDeliveryBadge status="unknown" />);

    expect(screen.getByText('État inconnu')).toHaveClass('text-muted-foreground');
  });
});
