import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, getAuthToken, setAuthToken, setUnauthorizedHandler } from '../lib/apiClient';

interface SessionUser {
  uid: string;
  email: string;
  driverName?: string;
}

interface AuthContextType {
  user: SessionUser | null;
  role: 'admin' | 'sales' | 'driver' | 'visitor' | null;
  loading: boolean;
  login: (usernameOrEmail: string, passwordInput: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<'admin' | 'sales' | 'driver' | 'visitor' | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    setAuthToken(null);
    setUser(null);
    setRole(null);
  };

  const login = async (usernameOrEmail: string, passwordInput: string) => {
    // Login itself has no token yet, so it uses plain fetch, not apiFetch
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password: passwordInput })
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.code) {
        throw new Error(data.code);
      }
      throw new Error(data.message || 'Error logging in');
    }

    const sessionUser = { uid: data.user.uid, email: data.user.email, driverName: data.user.driverName || "" };
    setAuthToken(data.token);
    setUser(sessionUser);
    setRole(data.role);
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Even if the network call fails, still clear the local session
      console.error('Logout request failed:', e);
    }
    clearSession();
  };

  useEffect(() => {
    // If the server ever rejects our token (expired/invalid/disabled user),
    // drop the local session so the login screen shows up again.
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      const token = getAuthToken();
      if (token) {
        try {
          const res = await apiFetch('/api/auth/me');
          if (res.ok) {
            const { user: currentUser, role: currentRole } = await res.json();
            setUser({ uid: currentUser.uid, email: currentUser.email, driverName: currentUser.driverName || "" });
            setRole(currentRole);
          } else {
            // Token expired/invalid/user disabled or removed
            clearSession();
          }
        } catch (e) {
          console.error('Session restoration error:', e);
          // Network hiccup: keep the token, but don't block the UI forever
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
