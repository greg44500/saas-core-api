import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      aria-label={`Activer le thème ${nextTheme === 'dark' ? 'sombre' : 'clair'}`}
      onClick={() => setTheme(nextTheme)}
      size="icon"
      variant="outline"
    >
      {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}

export { ThemeToggle };
