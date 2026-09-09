import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PreferencesPage } from '@/features/preferences/pages/preferences-page';

const applyComfortPreferences = vi.hoisted(() => vi.fn());
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

vi.mock('@/components/shared/theme-provider', () => ({
  useTheme: () => ({
    applyComfortPreferences,
    comfortPreferences: {
      theme: 'dark',
      fontFamily: 'geist',
      paletteId: 'core',
      accessibilityMode: 'standard',
    },
  }),
}));

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
          fontFamily: 'manrope',
          paletteId: 'core',
          accessibilityMode: 'enhanced',
        },
      }),
    });
  });

  it('propose les polices contrôlées du Design System', () => {
    render(<PreferencesPage />);

    const fontSelect = screen.getByLabelText('Police');

    expect(fontSelect).toHaveDisplayValue('Inter');
    expect(screen.getByRole('option', { name: 'Geist' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Manrope' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Police du système' }))
      .toBeInTheDocument();
  });

  it('prévisualise une palette puis restaure la préférence sauvegardée sans validation', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PreferencesPage />);

    await user.click(screen.getByRole('button', { name: 'Core Atlantique' }));

    expect(applyComfortPreferences).toHaveBeenLastCalledWith({
      theme: 'dark',
      fontFamily: 'geist',
      paletteId: 'core',
      accessibilityMode: 'standard',
    }, { persistLocal: false });

    unmount();

    expect(applyComfortPreferences).toHaveBeenLastCalledWith({
      theme: 'system',
      fontFamily: 'inter',
      paletteId: 'core',
      accessibilityMode: 'standard',
    }, { persistLocal: false });
  });

  it('enregistre uniquement des préférences de confort contrôlées', async () => {
    const user = userEvent.setup();
    render(<PreferencesPage />);

    await user.selectOptions(screen.getByLabelText('Thème'), 'dark');
    await user.selectOptions(screen.getByLabelText('Police'), 'manrope');
    await user.click(screen.getByRole('switch', {
      name: 'Activer le profil d’accessibilité renforcée',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Enregistrer les préférences',
    }));

    expect(updatePreferences).toHaveBeenCalledWith({
      comfort: {
        theme: 'dark',
        fontFamily: 'manrope',
        paletteId: 'core',
        accessibilityMode: 'enhanced',
      },
    });
    expect(applyComfortPreferences).toHaveBeenLastCalledWith({
      theme: 'dark',
      fontFamily: 'manrope',
      paletteId: 'core',
      accessibilityMode: 'enhanced',
    }, { persistLocal: false });
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
