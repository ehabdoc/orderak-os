export type Theme = 'light' | 'dark';

const KEY = 'orderak.theme';

export function getTheme(): Theme {
  const stored = localStorage.getItem(KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function applyInitialTheme() {
  setTheme(getTheme());
}
