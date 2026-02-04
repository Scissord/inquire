'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useThemeStore } from '@/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const theme = useThemeStore((state) => state.theme);

  // Apply theme class ASAP (before paint) to avoid "white bg + white text"
  useLayoutEffect(() => {
    initializeTheme();
    setMounted(true);
  }, [initializeTheme]);

  // Применяем тему сразу при монтировании
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // Предотвращаем мигание при первой загрузке
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
