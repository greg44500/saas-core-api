import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';
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
      <TooltipProvider delay={0}>
        <PlatformSidebar collapsed={collapsed} onToggle={onToggle} />
      </TooltipProvider>
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

  it('reste ancrée au viewport et fait défiler sa navigation en mode déployé', () => {
    renderSidebar();

    expect(screen.getByRole('complementary')).toHaveClass(
      'sticky',
      'top-0',
      'h-svh',
      'self-start',
    );
    expect(
      screen.getByRole('navigation', { name: 'Navigation de la plateforme' }),
    ).toHaveClass('min-h-0', 'overflow-y-auto', 'overflow-x-hidden');
  });

  it('préserve les flyouts hors du cadre en mode réduit', () => {
    renderSidebar({ collapsed: true });

    expect(
      screen.getByRole('navigation', { name: 'Navigation de la plateforme' }),
    ).toHaveClass('overflow-visible');
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

  it('utilise le tooltip shadcn/Base UI en sidebar réduite et ferme le flyout après navigation', async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: true });

    const securityGroup = screen.getByRole('button', {
      name: 'Sécurité & données',
    });

    expect(screen.queryByText('Sécurité & données', { exact: true })).not.toBeInTheDocument();

    await user.hover(securityGroup);
    expect(await screen.findByText('Sécurité & données', { exact: true })).toBeInTheDocument();

    await user.unhover(securityGroup);
    expect(screen.queryByText('Sécurité & données', { exact: true })).not.toBeInTheDocument();
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
