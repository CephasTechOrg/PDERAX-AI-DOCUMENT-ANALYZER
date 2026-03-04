/**
 * Authentication Context
 * Initialises synchronously from localStorage so there is no loading flash.
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, AuthSession } from '@/types';
import authService from '@/services/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, full_name: string, password: string, password_confirm: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Read stored session synchronously — safe to call during render */
function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    return authService.getSession();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialise directly from localStorage — no useEffect, no loading flash.
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [user, setUser]       = useState<User | null>(() => readStoredSession()?.user ?? null);
  // isLoading is only true during async operations (login / logout / refresh).
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const authSession = await authService.login({ email, password });
      setSession(authSession);
      setUser(authSession.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (
    email: string,
    full_name: string,
    password: string,
    password_confirm: string,
  ): Promise<{ message: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      return await authService.signup({ email, full_name, password, password_confirm });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      setSession(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logout failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const newSession = await authService.refreshToken();
      setSession(newSession);
      setUser(newSession.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session refresh failed';
      setError(msg);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    session,
    login,
    signup,
    logout,
    refreshSession,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
