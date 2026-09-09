import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PreferencesPage } from '@/features/preferences/pages/preferences-page';

const toast = vi.fn();
const updatePreferences = vi.fn();
const preferencesQuery = {
  data: {
    comfort: {
      theme: 'system',
      fontFamily: 'inter',
      paletteId: 'core',
      accessibilityMode: 'standard',
    },
  },
  isError: false,
  isFetching: false,
  isLoading: false,
  refetch: vi.fn(),
};

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@/features/preferences/api/user-preferences-api', () => ({
  useGetCurrentUserPreferencesQuery: () => preferencesQuery,
  useUpdateCurrentUserPreferencesMutation: () => [
    updatePreferences,
    { isLoading: false },
  ],
}));

describe('PreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferencesQuery.data = {
      comfort: {
        theme: 'system',
        fontFamily: 'inter',
        paletteId: 'core',
        accessibilityMode: 'standard',
      },
    };
    preferencesQuery.isError = false;
    preferencesQuery.isFetching = false;
    preferencesQuery.isLoading = false;

    updatePreferences.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        comfort: {
          theme: 'dark',
          fontFamily: 'system',
          paletteId: 'core',
          accessibilityMode: 'enhanced',
        },
      }),
    });
  });

  it('enregistre uniquement des préférences de confort contrôlées', async () => {
    const user = userEvent.setup();
    render(<PreferencesPage />);

    await user.selectOptions(screen.getByLabelText('Thème'), 'dark');
    await user.selectOptions(screen.getByLabelText('Police'), 'system');
    await user.click(screen.getByRole('switch', {
      name: 'Activer le profil d’accessibilité renforcée',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Enregistrer les préférences',
    }));

    expect(updatePreferences).toHaveBeenCalledWith({
      comfort: {
        theme: 'dark',
        fontFamily: 'system',
        paletteId: 'core',
        accessibilityMode: 'enhanced',
      },
    });
  });

  it('utilise le skeleton partagé lors du chargement initial', () => {
    preferencesQuery.data = undefined;
    preferencesQuery.isLoading = true;

    render(<PreferencesPage />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement des préférences…',
    );
    expect(screen.queryByRole('heading', { name: 'Préférences' }))
      .not.toBeInTheDocument();
  });
});
