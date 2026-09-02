import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RolePermissionsDrawer } from '@/features/workspace-roles/components/role-permissions-drawer';

const role = {
  id: 'role-1',
  name: 'Administrateur',
  description: 'Administration du workspace',
  isSystem: true,
  permissions: ['workspace:read'],
};

describe('RolePermissionsDrawer', () => {
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

  it('reste rendu avec le dernier rôle pendant la transition de fermeture', () => {
    const { rerender } = render(
      <RolePermissionsDrawer
        onClose={vi.fn()}
        open
        role={role}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveClass('translate-x-0');
    expect(screen.getByText('Administrateur')).toBeInTheDocument();

    rerender(
      <RolePermissionsDrawer
        onClose={vi.fn()}
        open={false}
        role={null}
      />,
    );

    const closingDrawer = screen.getByRole('dialog', { hidden: true });

    expect(closingDrawer).toHaveClass('translate-x-full');
    expect(screen.getByText('Administrateur')).toBeInTheDocument();
    expect(screen.getByText('Administration du workspace')).toBeInTheDocument();

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
