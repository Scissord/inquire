'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/store';
import {
  Confirmation,
  Notification,
  ThemeProvider,
  FloatingThemeButton,
} from '@/components';
import { usePathname, useRouter } from 'next/navigation';
// import { setup } from '@/api';

export default function Provider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUserStore((state) => state.user);
  const hasHydrated = useUserStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!pathname || !hasHydrated) return;

    const isAuthPage = pathname.startsWith('/auth');
    if (isAuthPage && user?.id) {
      router.push('/');
    } else if (!isAuthPage && !user?.id) {
      router.push('/auth');
    }
  }, [pathname, user, router, hasHydrated]);

  return (
    <ThemeProvider>
      <Confirmation />
      <Notification />
      <FloatingThemeButton />
      {children}
    </ThemeProvider>
  );
}
