import { create } from 'zustand';
import { User, AuthResponse } from '@/types/auth';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setTokens: (accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({ accessToken, refreshToken });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setAuth: (auth) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', auth.accessToken);
      localStorage.setItem('token', auth.accessToken);
      localStorage.setItem('refreshToken', auth.refreshToken);
    }
    set({
      user: auth.user,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      error: null,
    });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      error: null,
    });
  },
}));
