'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    setMounted(true);
    initializeTheme();
  }, [initializeTheme]);

  // Применяем тему сразу при монтировании
  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme, mounted]);

  // Предотвращаем мигание при первой загрузке
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
