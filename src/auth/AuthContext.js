import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "../../api/client"; // 👈 ojo: ajusta si tu ruta es distinta


const AuthContext = createContext(null);
const TOKEN_KEY = "token";

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);

  const loadSession = async () => {
    setBooting(true);
    try {
      const t = await AsyncStorage.getItem(TOKEN_KEY);

      if (!t) {
        setAuthToken(null);
        setToken(null);
        setMe(null);
        return;
      }

      setAuthToken(t);
      setToken(t);

      const res = await api.get("/auth/me");
      setMe(res.data);
    } catch (e) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
      setToken(null);
      setMe(null);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const signIn = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (!res.data?.ok || !res.data?.token) throw new Error("Login inválido");

    const t = res.data.token;

    await AsyncStorage.setItem(TOKEN_KEY, t);
    setAuthToken(t);
    setToken(t);

    const meRes = await api.get("/auth/me");
    setMe(meRes.data);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setMe(null);
  };

  const value = useMemo(
    () => ({ booting: !!booting, token, me, signIn, signOut, reload: loadSession }),
    [booting, token, me]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
