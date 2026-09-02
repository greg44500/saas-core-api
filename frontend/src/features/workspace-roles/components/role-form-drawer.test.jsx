import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoleFormDrawer } from '@/features/workspace-roles/components/role-form-drawer';

const role = {
  id: 'role-1',
  name: 'Gestionnaire',
  description: 'Gestion quotidienne',
  permissions: ['workspace:read'],
};

describe('RoleFormDrawer', () => {
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

  it('conserve le contexte d’édition pendant la transition de fermeture', () => {
    const commonProps = {
      actorPermissions: ['workspace:read'],
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      pending: false,
    };

    const { rerender } = render(
      <RoleFormDrawer
        {...commonProps}
        mode="edit"
        open
        role={role}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveClass('translate-x-0');
    expect(screen.getByRole('heading', { name: 'Modifier Gestionnaire' })).toBeInTheDocument();

    rerender(
      <RoleFormDrawer
        {...commonProps}
        mode={null}
        open={false}
        role={null}
      />,
    );

    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('translate-x-full');
    expect(
      screen.getByRole('heading', { name: 'Modifier Gestionnaire', hidden: true }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
  });
});
