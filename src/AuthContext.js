import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import storage from './storage';
import api, { setToken, setUnauthorizedHandler } from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [s, setS] = useState({ loading: true, token: null, user: null });
  const signOut = useCallback(async () => {
    setToken(null); await storage.deleteItem('token'); await storage.deleteItem('user');
    setS({ loading: false, token: null, user: null });
  }, []);
  const signIn = async (token, user) => {
    setToken(token); await storage.setItem('token', token); await storage.setItem('user', JSON.stringify(user));
    setS({ loading: false, token, user });
  };
  const updateUser = async (user) => { await storage.setItem('user', JSON.stringify(user)); setS((p) => ({ ...p, user })); };

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    (async () => {                                   // restore session; stay signed in if offline
      const t = await storage.getItem('token');
      if (!t) return setS({ loading: false, token: null, user: null });
      setToken(t);
      let cached = null; try { cached = JSON.parse(await storage.getItem('user')); } catch {}
      setS({ loading: false, token: t, user: cached });
      try { const { data } = await api.get('/auth/me'); updateUser(data); } catch {}   // 401 handler signs out
    })();
  }, []);
  return <Ctx.Provider value={{ ...s, signIn, signOut, updateUser }}>{children}</Ctx.Provider>;
}
