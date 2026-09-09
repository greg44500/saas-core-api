import { Moon, Sun } from 'lucide-react';
import { useSelector } from 'react-redux';

import { useTheme } from '@/components/shared/theme-provider';
import { Button } from '@/components/ui/button';
import { selectAuthStatus } from '@/features/auth/store/auth-slice';
import {
  useUpdateCurrentUserPreferencesMutation,
} from '@/features/preferences/api/user-preferences-api';
import { APPEARANCE_THEME } from '@/lib/appearance-preferences';

function ThemeToggle() {
  const authStatus = useSelector(selectAuthStatus);
  const { resolvedTheme, setTheme } = useTheme();
  const [updatePreferences, { isLoading }] = useUpdateCurrentUserPreferencesMutation();
  const nextTheme = resolvedTheme === APPEARANCE_THEME.DARK
    ? APPEARANCE_THEME.LIGHT
    : APPEARANCE_THEME.DARK;

  async function handleToggle() {
    if (authStatus !== 'authenticated') {
      setTheme(nextTheme, { persistLocal: true });
      return;
    }

    try {
      await updatePreferences({
        comfort: { theme: nextTheme },
      }).unwrap();
      setTheme(nextTheme, { persistLocal: false });
    } catch {
      // Une préférence serveur en échec ne doit pas créer un état local divergent.
    }
  }

  return (
    <Button
      aria-label={`Activer le thème ${nextTheme === APPEARANCE_THEME.DARK ? 'sombre' : 'clair'}`}
      disabled={isLoading}
      onClick={handleToggle}
      size="icon"
      variant="outline"
    >
      {resolvedTheme === APPEARANCE_THEME.DARK
        ? <Sun aria-hidden="true" />
        : <Moon aria-hidden="true" />}
    </Button>
  );
}

export { ThemeToggle };
