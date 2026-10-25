import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setToken, setUnauthorizedHandler } from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [s, setS] = useState({ loading: true, token: null, user: null });
  const signOut = useCallback(async () => {
    setToken(null); await SecureStore.deleteItemAsync('token'); await SecureStore.deleteItemAsync('user');
    setS({ loading: false, token: null, user: null });
  }, []);
  const signIn = async (token, user) => {
    setToken(token); await SecureStore.setItemAsync('token', token); await SecureStore.setItemAsync('user', JSON.stringify(user));
    setS({ loading: false, token, user });
  };
  const updateUser = async (user) => { await SecureStore.setItemAsync('user', JSON.stringify(user)); setS((p) => ({ ...p, user })); };

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    (async () => {                                   // restore session; stay signed in if offline
      const t = await SecureStore.getItemAsync('token');
      if (!t) return setS({ loading: false, token: null, user: null });
      setToken(t);
      let cached = null; try { cached = JSON.parse(await SecureStore.getItemAsync('user')); } catch {}
      setS({ loading: false, token: t, user: cached });
      try { const { data } = await api.get('/auth/me'); updateUser(data); } catch {}   // 401 handler signs out
    })();
  }, []);
  return <Ctx.Provider value={{ ...s, signIn, signOut, updateUser }}>{children}</Ctx.Provider>;
}
