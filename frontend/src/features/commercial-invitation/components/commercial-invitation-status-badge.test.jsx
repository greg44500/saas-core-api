import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CommercialInvitationStatusBadge } from '@/features/commercial-invitation/components/commercial-invitation-status-badge';

describe('CommercialInvitationStatusBadge', () => {
  it.each([
    ['pending', 'En attente', 'text-warning'],
    ['accepted', 'Acceptée', 'text-success'],
    ['declined', 'Refusée', 'text-destructive'],
    ['revoked', 'Révoquée', 'text-destructive'],
    ['expired', 'Expirée', 'text-destructive'],
  ])('associe %s à son état visuel sémantique', (status, label, className) => {
    render(<CommercialInvitationStatusBadge status={status} />);

    const badge = screen.getByText(label);
    expect(badge).toHaveClass(className);
  });
});
