import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTableSkeleton } from '@/components/data-display/data-table-skeleton';

describe('loading skeleton compositions', () => {
  it('annonce le chargement du tableau sans exposer de fausses données', () => {
    const { container } = render(<DataTableSkeleton columns={3} rows={2} />);

    expect(screen.getByRole('status')).toHaveTextContent('Chargement du tableau…');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelectorAll('tbody td')).toHaveLength(6);
  });
});
