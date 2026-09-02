import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const updateWorkspaceMock = vi.hoisted(() => vi.fn());
const updateUnwrapMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useUpdateWorkspaceMutation: () => [
    updateWorkspaceMock,
    { isLoading: false },
  ],
}));

import { WorkspaceGeneralSettingsForm } from '@/features/workspace/components/workspace-general-settings-form';

const workspace = {
  id: '507f1f77bcf86cd799439011',
  name: 'Workspace Démo',
};

function renderForm() {
  return render(
    <ToastProvider>
      <WorkspaceGeneralSettingsForm canUpdate workspace={workspace} />
    </ToastProvider>,
  );
}

describe('WorkspaceGeneralSettingsForm', () => {
  beforeEach(() => {
    updateWorkspaceMock.mockReset();
    updateUnwrapMock.mockReset();
    updateWorkspaceMock.mockReturnValue({ unwrap: updateUnwrapMock });
  });

  afterEach(() => {
    cleanup();
  });

  it('envoie uniquement le nouveau nom et confirme le succès par toast', async () => {
    const user = userEvent.setup();
    updateUnwrapMock.mockResolvedValue({
      ...workspace,
      name: 'Nouveau nom',
    });

    renderForm();

    const nameInput = screen.getByLabelText('Nom du workspace');
    await user.clear(nameInput);
    await user.type(nameInput, 'Nouveau nom');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(updateWorkspaceMock).toHaveBeenCalledWith({
        workspaceId: workspace.id,
        name: 'Nouveau nom',
      });
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nom du workspace mis à jour',
    );
  });

  it('présente un refus backend dans un toast sans reconstruire la règle côté frontend', async () => {
    const user = userEvent.setup();
    updateUnwrapMock.mockRejectedValue({
      data: {
        message: 'Workspace indisponible',
      },
    });

    renderForm();

    const nameInput = screen.getByLabelText('Nom du workspace');
    await user.clear(nameInput);
    await user.type(nameInput, 'Nouveau nom');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Modification impossible');
    expect(alert).toHaveTextContent('Workspace indisponible');
  });
});
