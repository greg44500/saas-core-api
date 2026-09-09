import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

vi.mock('@/features/platform/components/platform-user-identity', () => ({
  PlatformUserIdentity: () => <div>Identité Platform</div>,
}));

vi.mock('@/features/platform/components/platform-sidebar', () => ({
  PlatformSidebar: () => <aside>Navigation administration</aside>,
}));

import { PlatformLayout } from '@/app/layouts/platform-layout';

describe('PlatformLayout', () => {
  afterEach(() => cleanup());

  it('affiche un intitulé unique et le bloc d’identité Platform', () => {
    render(
      <MemoryRouter initialEntries={['/platform/overview']}>
        <Routes>
          <Route element={<PlatformLayout />} path="/platform">
            <Route index element={<p>Contenu Platform</p>} />
            <Route element={<p>Contenu Platform</p>} path="overview" />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Console d’administration globale'),
    ).toBeInTheDocument();
    expect(screen.getByText('Identité Platform')).toBeInTheDocument();
    expect(screen.queryByText('Console Platform')).not.toBeInTheDocument();
  });
});
