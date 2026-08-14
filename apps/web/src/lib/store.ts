import { create } from 'zustand';
import { api, getToken, setToken } from './api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  login: async (pin: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { pin });
    setToken(res.token);
    set({ user: res.user });
  },
  logout: () => {
    setToken(null);
    set({ user: null });
  },
  hydrate: async () => {
    if (!getToken()) {
      set({ loading: false });
      return;
    }
    try {
      const res = await api.get<{ user: User & { userId: number } }>('/auth/me');
      set({ user: { id: res.user.userId, name: res.user.name, role: res.user.role } });
    } catch {
      setToken(null);
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },
}));
