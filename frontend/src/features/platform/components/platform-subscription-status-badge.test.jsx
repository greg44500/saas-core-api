import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformSubscriptionStatusBadge } from '@/features/platform/components/platform-subscription-status-badge';

describe('PlatformSubscriptionStatusBadge', () => {
  it.each([
    ['active', 'Actif', 'text-success'],
    ['trialing', 'Trial', 'text-warning'],
    ['past_due', 'Paiement en retard', 'text-destructive'],
    ['canceled', 'Annulé', 'text-muted-foreground'],
    ['expired', 'Expiré', 'text-muted-foreground'],
  ])('affiche %s avec son ton métier', (status, label, expectedClass) => {
    render(<PlatformSubscriptionStatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveClass(expectedClass);
  });
});
