import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  profile?: any;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  // False until zustand-persist has rehydrated from localStorage. Route
  // guards MUST wait for this before acting, otherwise the first client
  // render (initial state, isAuthenticated:false) would bounce a genuinely
  // logged-in user out before their persisted state loads.
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setAuth: (user, accessToken, refreshToken) => {
        if (typeof document !== 'undefined') {
          // 7 days — must match JWT_REFRESH_EXPIRES_IN so the route gate
          // does not log the user out while their refresh token is still valid.
          document.cookie = 'athena_session=1; path=/; max-age=604800; SameSite=Strict';
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'athena_session=; path=/; max-age=0';
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'athena-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
