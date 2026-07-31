// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { createContext, useCallback, useContext, useState } from 'react';
import apiClient from '../services/apiClient';

interface AuthState {
  isAuthenticated: boolean;
  user: { name: string; role: string } | null;
  login: (name: string, role: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
});

/** Fire-and-forget audit log entry for login/logout events. */
function logAuthEvent(action: 'login' | 'logout', name: string, role: string) {
  apiClient
    .post('/audit-log/event', {
      actor: name,
      actor_type: 'human',
      action_type: 'system',
      details: { event: action, role, timestamp: new Date().toISOString() },
    })
    .catch(() => {
      // Silently ignore — auth events are best-effort
    });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ name: string; role: string } | null>(() => {
    try {
      const stored = sessionStorage.getItem('pivot_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      sessionStorage.removeItem('pivot_user');
      return null;
    }
  });

  const login = useCallback((name: string, role: string) => {
    const u = { name, role };
    setUser(u);
    sessionStorage.setItem('pivot_user', JSON.stringify(u));
    logAuthEvent('login', name, role);
  }, []);

  const logout = useCallback(() => {
    if (user) {
      logAuthEvent('logout', user.name, user.role);
    }
    setUser(null);
    sessionStorage.removeItem('pivot_user');
  }, [user]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
