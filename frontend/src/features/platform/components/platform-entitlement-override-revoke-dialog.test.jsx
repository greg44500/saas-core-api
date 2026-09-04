import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformEntitlementOverrideRevokeDialog } from '@/features/platform/components/platform-entitlement-override-revoke-dialog';

const override = {
  id: 'override-id',
  workspace: { id: 'workspace-id', name: 'Workspace Démo' },
};

describe('PlatformEntitlementOverrideRevokeDialog', () => {
  afterEach(() => cleanup());

  it('valide localement le motif avant de déléguer la mutation', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <PlatformEntitlementOverrideRevokeDialog
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        override={override}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Révoquer la dérogation ?' });
    await user.type(within(dialog).getByLabelText('Motif de révocation'), 'x');
    await user.click(within(dialog).getByRole('button', { name: 'Révoquer' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent(/entre 3 et 500 caractères/);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.clear(within(dialog).getByLabelText('Motif de révocation'));
    await user.type(within(dialog).getByLabelText('Motif de révocation'), 'Fin du geste commercial');
    await user.click(within(dialog).getByRole('button', { name: 'Révoquer' }));

    expect(onConfirm).toHaveBeenCalledWith('Fin du geste commercial');
  });
});
