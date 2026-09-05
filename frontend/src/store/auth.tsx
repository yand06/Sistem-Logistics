import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL as string;
export const API = `${BACKEND_URL}/api`;

axios.defaults.headers.common["Content-Type"] = "application/json";

export type Role = "admin" | "sales" | "cs" | "customs" | "finance" | "pricing";
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthCtx {
  user: User | null | undefined; // undefined = loading, null = logged out
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("nf_token"));

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    axios
      .get(`${API}/auth/me`)
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem("nf_token");
        setToken(null);
        setUser(null);
      });
  }, [token]);

  async function login(email: string, password: string) {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    // clear any previous user's cached data before switching identity
    qc.clear();
    localStorage.setItem("nf_token", data.access_token);
    setToken(data.access_token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
    setUser(data.user);
  }

  function logout() {
    qc.clear();
    localStorage.removeItem("nf_token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>;
}

export const api = {
  get: (p: string) => axios.get(`${API}${p}`).then((r) => r.data),
  post: (p: string, b: any) => axios.post(`${API}${p}`, b).then((r) => r.data),
  patch: (p: string, b: any) => axios.patch(`${API}${p}`, b).then((r) => r.data),
  del: (p: string) => axios.delete(`${API}${p}`).then((r) => r.data),
};
