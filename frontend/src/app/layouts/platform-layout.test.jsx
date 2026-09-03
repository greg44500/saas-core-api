import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

vi.mock('@/components/shared/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Thème</button>,
}));

vi.mock('@/features/auth/components/user-menu', () => ({
  UserMenu: () => <button type="button">Compte</button>,
}));

vi.mock('@/features/platform/components/platform-sidebar', () => ({
  PlatformSidebar: () => <aside>Navigation administration</aside>,
}));

import { PlatformLayout } from '@/app/layouts/platform-layout';

describe('PlatformLayout', () => {
  afterEach(() => cleanup());

  it('affiche un intitulé unique pour la console d’administration', () => {
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
    expect(screen.queryByText('Console Platform')).not.toBeInTheDocument();
  });
});
