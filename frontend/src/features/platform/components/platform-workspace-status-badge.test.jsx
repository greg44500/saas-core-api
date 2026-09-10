import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformWorkspaceStatusBadge } from '@/features/platform/components/platform-workspace-status-badge';

describe('PlatformWorkspaceStatusBadge', () => {
  it.each([
    ['active', 'Actif', 'text-success'],
    ['suspended', 'Suspendu', 'text-warning'],
    ['archived', 'Archivé', 'text-muted-foreground'],
    ['closed', 'Clôturé', 'text-destructive'],
  ])('affiche %s avec son ton métier', (status, label, expectedClass) => {
    render(<PlatformWorkspaceStatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveClass(expectedClass);
  });
});
