import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, clearAuthTokens, setAccessToken, logout as apiLogout } from "@/lib/api";
import { AuthContext } from "@/components/auth/AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiRequest("/api/auth/me", { auth: true });
      setUser(me);
      setIsAuthenticated(true);
      return me;
    } catch {
      clearAuthTokens();
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setSession = useCallback(async (accessToken) => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshSession();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      loading,
      refreshSession,
      setSession,
      logout,
    }),
    [user, isAuthenticated, loading, refreshSession, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
