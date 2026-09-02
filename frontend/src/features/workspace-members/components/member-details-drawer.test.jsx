import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberDetailsDrawer } from '@/features/workspace-members/components/member-details-drawer';

const member = {
  id: 'member-1',
  status: 'active',
  joinedAt: '2026-08-01T00:00:00.000Z',
  user: {
    firstName: 'Marie',
    lastName: 'Martin',
  },
  role: {
    id: 'role-1',
    name: 'Administrateur',
  },
};

const role = {
  id: 'role-1',
  name: 'Administrateur',
  permissions: ['workspace:read'],
};

describe('MemberDetailsDrawer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('conserve les données affichées pendant toute la transition de fermeture', () => {
    const { rerender } = render(
      <MemberDetailsDrawer
        member={member}
        onClose={vi.fn()}
        open
        role={role}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveClass('translate-x-0');
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();

    rerender(
      <MemberDetailsDrawer
        member={null}
        onClose={vi.fn()}
        open={false}
        role={null}
      />,
    );

    const closingDrawer = screen.getByRole('dialog', { hidden: true });

    expect(closingDrawer).toHaveClass('translate-x-full');
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Administrateur')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
  });
});
