import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('WorkspaceGeneralSettingsForm', () => {
  beforeEach(() => {
    updateWorkspaceMock.mockReset();
    updateUnwrapMock.mockReset();
    updateWorkspaceMock.mockReturnValue({ unwrap: updateUnwrapMock });
  });

  afterEach(() => {
    cleanup();
  });

  it('envoie uniquement le nouveau nom au contrat workspace', async () => {
    const user = userEvent.setup();
    updateUnwrapMock.mockResolvedValue({
      ...workspace,
      name: 'Nouveau nom',
    });

    render(<WorkspaceGeneralSettingsForm canUpdate workspace={workspace} />);

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
    expect(
      await screen.findByText('Le nom du workspace a été mis à jour.'),
    ).toBeInTheDocument();
  });

  it('présente un refus backend sans reconstruire la règle côté frontend', async () => {
    const user = userEvent.setup();
    updateUnwrapMock.mockRejectedValue({
      data: {
        message: 'Workspace indisponible',
      },
    });

    render(<WorkspaceGeneralSettingsForm canUpdate workspace={workspace} />);

    const nameInput = screen.getByLabelText('Nom du workspace');
    await user.clear(nameInput);
    await user.type(nameInput, 'Nouveau nom');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Workspace indisponible')).toBeInTheDocument();
  });
});
