import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { PlatformSidebar } from '@/features/platform/components/platform-sidebar';

function renderSidebar({ collapsed = false, onToggle = vi.fn() } = {}) {
  render(
    <MemoryRouter initialEntries={['/platform/overview']}>
      <PlatformSidebar collapsed={collapsed} onToggle={onToggle} />
    </MemoryRouter>,
  );
}

describe('PlatformSidebar', () => {
  afterEach(() => cleanup());

  it('regroupe les destinations par intention d’administration', () => {
    renderSidebar();

    expect(screen.getByRole('group', { name: 'Pilotage' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Clients' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Commercial' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Supervision' })).toBeInTheDocument();

    expect(screen.getByText('Vue d’ensemble')).toBeInTheDocument();
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Espaces de travail')).toBeInTheDocument();
    expect(screen.getByText('Plans')).toBeInTheDocument();
    expect(screen.getByText('Abonnements')).toBeInTheDocument();
    expect(screen.getByText('Journaux d’audit')).toBeInTheDocument();
  });

  it('expose des tooltips quand la sidebar est réduite', () => {
    renderSidebar({ collapsed: true });

    expect(screen.getByRole('tooltip', { name: 'Vue d’ensemble' })).toBeInTheDocument();
    expect(screen.getByRole('tooltip', { name: 'Utilisateurs' })).toBeInTheDocument();
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
