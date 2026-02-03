import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IUser } from '@/interfaces/auth/user';

interface State {
  user: IUser | null;
  hasHydrated: boolean;
  setUser: (user: IUser) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

export const useUserStore = create<State>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      setHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'user-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
