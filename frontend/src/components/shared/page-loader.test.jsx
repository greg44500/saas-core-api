import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLoader } from '@/components/shared/page-loader';

describe('PageLoader', () => {
  it('annonce le chargement tout en utilisant un skeleton visuel neutre', () => {
    const { container } = render(<PageLoader />);

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });
});
