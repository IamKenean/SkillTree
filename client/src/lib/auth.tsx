import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, getToken, setToken, User } from './api';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  signup: (data: { username: string; email: string; password: string; avatar?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) { setLoading(false); return; }
    api.me().then(r => setUser(r.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const r = await api.login({ usernameOrEmail, password });
    setToken(r.token);
    setUser(r.user);
  }, []);

  const signup = useCallback(async (data: { username: string; email: string; password: string; avatar?: string }) => {
    const r = await api.signup(data);
    setToken(r.token);
    setUser(r.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const r = await api.me();
    setUser(r.user);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, signup, logout, refreshUser, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
