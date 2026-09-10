import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

vi.mock('@/features/platform/components/platform-dashboard-display-preferences', () => ({
  PlatformDashboardDisplayPreferences: () => <button type="button">Personnaliser Platform</button>,
}));

vi.mock('@/features/platform/components/platform-user-identity', () => ({
  PlatformUserIdentity: () => <div>Identité Platform</div>,
}));

vi.mock('@/features/platform/components/platform-sidebar', () => ({
  PlatformSidebar: () => <aside>Navigation administration</aside>,
}));

import { PlatformLayout } from '@/app/layouts/platform-layout';

function renderLayout(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<PlatformLayout />} path="/platform">
          <Route element={<p>Vue d’ensemble</p>} path="overview" />
          <Route element={<p>Utilisateurs Platform</p>} path="users" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlatformLayout', () => {
  afterEach(() => cleanup());

  it('affiche la personnalisation sur la vue d’ensemble Platform', () => {
    renderLayout('/platform/overview');

    expect(
      screen.getByText('Console d’administration globale'),
    ).toBeInTheDocument();
    expect(screen.getByText('Identité Platform')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personnaliser Platform' }))
      .toBeInTheDocument();
  });

  it('n’affiche pas la personnalisation sur les autres écrans Platform', () => {
    renderLayout('/platform/users');

    expect(screen.getByText('Utilisateurs Platform')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Personnaliser Platform' }))
      .not.toBeInTheDocument();
  });
});
