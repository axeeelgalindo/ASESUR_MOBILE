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
    try {
      const t = await AsyncStorage.getItem(TOKEN_KEY);

      if (!t) {
        setAuthToken(null);
        setToken(null);
        setMe(null);
        setBooting(false);
        return;
      }

      setAuthToken(t);
      setToken(t);
      setBooting(false);

      // Cargar datos del usuario en segundo plano sin congelar la app
      try {
        const res = await api.get("/auth/me");
        setMe(res.data);
      } catch (meError) {
        if (meError?.response?.status === 401) {
          await AsyncStorage.removeItem(TOKEN_KEY);
          setAuthToken(null);
          setToken(null);
          setMe(null);
        }
      }
    } catch {
      setAuthToken(null);
      setToken(null);
      setMe(null);
      setBooting(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const signIn = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (!res.data?.ok || !res.data?.token) throw new Error("Credenciales inválidas");

    const t = res.data.token;
    await AsyncStorage.setItem(TOKEN_KEY, t);
    setAuthToken(t);

    try {
      const meRes = await api.get("/auth/me");
      setMe(meRes.data);
    } catch (e) {
      console.log("Could not fetch me immediately:", e?.message);
    }

    setToken(t);
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
