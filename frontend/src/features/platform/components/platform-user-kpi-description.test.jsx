import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformUserKpiDescription } from '@/features/platform/components/platform-user-kpi-description';

describe('PlatformUserKpiDescription', () => {
  it('explique le total et la population client courante sans inventer une catégorie interne', () => {
    render(
      <PlatformUserKpiDescription
        population={{
          total: 12,
          withCurrentClientAccess: 8,
          withoutCurrentClientAccess: 4,
        }}
      />,
    );

    expect(screen.getByText('Total des comptes').nextElementSibling)
      .toHaveTextContent('12');
    expect(screen.getByText('Avec accès client actuel').nextElementSibling)
      .toHaveTextContent('8');
    expect(screen.getByText('Sans accès client actuel').nextElementSibling)
      .toHaveTextContent('4');
    expect(screen.getByText(/Un compte peut aussi disposer parallèlement/))
      .toBeInTheDocument();
  });
});
