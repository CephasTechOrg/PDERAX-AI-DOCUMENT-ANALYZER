/**
 * Authentication Context
 * Provides user state and auth methods to entire application
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from stored session
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedSession = authService.getSession();
        if (storedSession) {
          setSession(storedSession);
          setUser(storedSession.user);
        }
      } catch (err) {
        console.error('[AuthProvider] Failed to initialize auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const authSession = await authService.login({ email, password });
      setSession(authSession);
      setUser(authSession.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (
      email: string,
      full_name: string,
      password: string,
      password_confirm: string
    ): Promise<{ message: string }> => {
      setIsLoading(true);
      setError(null);
      try {
        // Backend returns { message } — user must verify email before logging in
        const result = await authService.signup({
          email,
          full_name,
          password,
          password_confirm,
        });
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Signup failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      setSession(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
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
      const errorMessage = err instanceof Error ? err.message : 'Session refresh failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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

/**
 * Hook to use auth context
 * Throws error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
