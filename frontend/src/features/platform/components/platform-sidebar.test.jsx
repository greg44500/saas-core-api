import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

import { PlatformSidebar } from '@/features/platform/components/platform-sidebar';

const allNavigationPermissions = Object.values(PLATFORM_PERMISSION);

function renderSidebar({
  collapsed = false,
  onToggle = vi.fn(),
  path = '/platform/overview',
} = {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <PlatformSidebar collapsed={collapsed} onToggle={onToggle} />
    </MemoryRouter>,
  );
}

describe('PlatformSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        status: 'active',
        permissions: allNavigationPermissions,
      },
    });
  });

  afterEach(() => cleanup());

  it('reprend la structure Platform figée sans dupliquer les onglets Équipe', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gestion clients' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Offre commerciale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Équipe Platform' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sécurité & données' })).toBeInTheDocument();
    expect(screen.getByText('Gestion des membres')).toBeInTheDocument();
    expect(screen.getByText('Rétention & purge')).toBeInTheDocument();
  });

  it('ouvre le groupe de la route active et ne garde qu’un accordéon ouvert', async () => {
    const user = userEvent.setup();
    renderSidebar({ path: '/platform/retention' });

    const securityGroup = screen.getByRole('button', {
      name: 'Sécurité & données',
    });
    const clientGroup = screen.getByRole('button', {
      name: 'Gestion clients',
    });

    expect(securityGroup).toHaveAttribute('aria-expanded', 'true');
    expect(clientGroup).toHaveAttribute('aria-expanded', 'false');

    await user.click(clientGroup);

    expect(clientGroup).toHaveAttribute('aria-expanded', 'true');
    expect(securityGroup).toHaveAttribute('aria-expanded', 'false');
  });

  it('masque entièrement un groupe sans enfant autorisé', () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        status: 'active',
        permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
      },
    });

    renderSidebar();

    expect(screen.getByRole('link', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gestion clients' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sécurité & données' })).not.toBeInTheDocument();
  });

  it('ouvre un flyout en sidebar réduite puis le ferme après navigation', async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: true });

    const securityGroup = screen.getByRole('button', {
      name: 'Sécurité & données',
    });

    expect(screen.getByRole('tooltip', { name: 'Sécurité & données' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Rétention & purge' })).not.toBeInTheDocument();

    await user.click(securityGroup);
    expect(screen.getByRole('link', { name: 'Rétention & purge' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Rétention & purge' }));
    expect(screen.queryByRole('link', { name: 'Rétention & purge' })).not.toBeInTheDocument();
  });

  it('déclenche le changement d’état de la sidebar', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    renderSidebar({ onToggle });

    await user.click(
      screen.getByRole('button', { name: 'Réduire la navigation d’administration' }),
    );

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
