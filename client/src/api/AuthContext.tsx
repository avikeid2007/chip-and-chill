import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { authApi, type AuthResponse } from "../api/auth";

interface AuthContextValue {
  user: AuthResponse | null;
  isLoading: boolean;
  login: (data: AuthResponse) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthResponse | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // In-memory state for user & short-lived access token (never persisted in localStorage)
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Silent refresh on initial mount to restore session from the secure HttpOnly cookie
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const data = await authApi.refresh();
        if (mounted && data?.token) {
          setUser(data);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Clean up any legacy localStorage/sessionStorage tokens for XSS hygiene
    localStorage.removeItem("chipandchill_auth");
    sessionStorage.removeItem("chipandchill_auth");

    return () => {
      mounted = false;
    };
  }, []);

  // Periodic silent background token refresh every 10 minutes (access token validity is 15 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const freshData = await authApi.refresh();
        if (freshData?.token) {
          setUser(freshData);
        }
      } catch {
        setUser(null);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [user?.token]);

  const login = (data: AuthResponse) => {
    setUser(data);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
    }
  };

  const refreshSession = async () => {
    try {
      const data = await authApi.refresh();
      if (data?.token) {
        setUser(data);
        return data;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
