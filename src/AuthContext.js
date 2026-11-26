import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import storage from './storage';
import api, { setToken, setUnauthorizedHandler } from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export const unwrapUser = (u) => {
  if (!u) return null;
  if (u.user) return unwrapUser(u.user);
  if (u.data) return unwrapUser(u.data);
  if (u._doc) return unwrapUser(u._doc);
  return u;
};

export function AuthProvider({ children }) {
  const [s, setS] = useState({ loading: true, token: null, user: null });
  const signOut = useCallback(async () => {
    setToken(null); await storage.deleteItem('token'); await storage.deleteItem('user');
    setS({ loading: false, token: null, user: null });
  }, []);
  const signIn = async (token, rawUser) => {
    const user = unwrapUser(rawUser);
    setToken(token); await storage.setItem('token', token); await storage.setItem('user', JSON.stringify(user));
    setS({ loading: false, token, user });
  };
  const updateUser = async (rawUser) => {
    const user = unwrapUser(rawUser);
    await storage.setItem('user', JSON.stringify(user));
    setS((p) => ({ ...p, user }));
  };

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    (async () => {                                   // restore session; stay signed in if offline
      const t = await storage.getItem('token');
      if (!t) return setS({ loading: false, token: null, user: null });
      setToken(t);
      let cached = null; try { cached = unwrapUser(JSON.parse(await storage.getItem('user'))); } catch {}
      setS({ loading: false, token: t, user: cached });
      try {
        const { data } = await api.get('/auth/me');
        if (data) {
          const u = unwrapUser(data);
          updateUser(u);
        }
      } catch {}   // 401 handler signs out
    })();
  }, []);
  return <Ctx.Provider value={{ ...s, signIn, signOut, updateUser }}>{children}</Ctx.Provider>;
}
