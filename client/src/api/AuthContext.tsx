import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthResponse } from "../api/auth";

interface AuthContextValue {
  user: AuthResponse | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "chipandchill_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read synchronously on first render (not in an effect) so route guards
  // that check `user` on mount don't redirect before the session loads.
  const [user, setUser] = useState<AuthResponse | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  const login = (data: AuthResponse) => {
    setUser(data);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
