import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/shared/theme-provider';
import { Button } from '@/components/ui/button';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      aria-label={`Activer le thème ${nextTheme === 'dark' ? 'sombre' : 'clair'}`}
      onClick={toggleTheme}
      size="icon"
      variant="outline"
    >
      {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}

export { ThemeToggle };
