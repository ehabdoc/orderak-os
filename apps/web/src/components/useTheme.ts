import { useEffect, useState } from 'react';
import { getTheme, setTheme, Theme } from '../lib/theme';

export function useTheme() {
  const [theme, setLocal] = useState<Theme>(getTheme());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return {
    theme,
    toggle: () => {
      const next = theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      setLocal(next);
    },
  };
}
