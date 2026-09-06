import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import { SectionTabs } from '@/components/shared/section-tabs';

const items = [
  { label: 'Membres', to: '/platform/team/members' },
  { label: 'Invitations', to: '/platform/team/invitations' },
  { label: 'Rôles et permissions', to: '/platform/team/roles' },
];

afterEach(() => cleanup());

describe('SectionTabs', () => {
  it('rend des onglets navigables avec un état actif explicite', () => {
    render(
      <MemoryRouter initialEntries={['/platform/team/invitations']}>
        <SectionTabs ariaLabel="Équipe de la Plateforme" items={items} />
      </MemoryRouter>,
    );

    const activeTab = screen.getByRole('tab', { name: 'Invitations' });

    expect(activeTab).toHaveAttribute('aria-current', 'page');
    expect(activeTab.className).toContain('border-primary');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
