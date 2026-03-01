/**
 * Authentication Service
 * Handles login, signup, logout, and session management
 */

import { apiClient } from './api';
import { User, AuthSession, LoginRequest, SignupRequest, ApiResponse } from '@/types';

class AuthService {
  /**
   * Register a new user
   */
  public async signup(data: SignupRequest): Promise<AuthSession> {
    try {
      const response = await apiClient.post<AuthSession>(
        '/api/auth/register',
        data
      );

      if (response.success && response.data) {
        this.saveSession(response.data);
        apiClient.setToken(response.data.access_token);
        return response.data;
      }

      throw new Error(response.error?.message || 'Signup failed');
    } catch (error) {
      console.error('[AuthService] Signup error:', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  public async login(data: LoginRequest): Promise<AuthSession> {
    try {
      const response = await apiClient.post<AuthSession>(
        '/api/auth/login',
        data
      );

      if (response.success && response.data) {
        this.saveSession(response.data);
        apiClient.setToken(response.data.access_token);
        return response.data;
      }

      throw new Error(response.error?.message || 'Login failed');
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user and clear session
   */
  public async logout(): Promise<void> {
    try {
      // Attempt to notify backend (optional, might fail if offline)
      try {
        await apiClient.post('/api/auth/logout', {});
      } catch (error) {
        console.warn('[AuthService] Backend logout failed:', error);
      }

      this.clearSession();
      apiClient.clearToken();
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current user from session
   */
  public getCurrentUser(): User | null {
    try {
      const session = this.getSession();
      return session?.user || null;
    } catch (error) {
      console.error('[AuthService] Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Get current session
   */
  public getSession(): AuthSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const sessionStr = localStorage.getItem('auth_session');
      if (!sessionStr) {
        return null;
      }

      const session = JSON.parse(sessionStr) as AuthSession;

      // Check if session has expired
      if (session.expires_at && session.expires_at < Date.now()) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('[AuthService] Failed to parse session:', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<AuthSession> {
    try {
      const session = this.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await apiClient.post<AuthSession>(
        '/api/auth/refresh',
        {
          refresh_token: session.refresh_token,
        }
      );

      if (response.success && response.data) {
        this.saveSession(response.data);
        apiClient.setToken(response.data.access_token);
        return response.data;
      }

      throw new Error(response.error?.message || 'Token refresh failed');
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error);
      this.clearSession();
      throw error;
    }
  }

  /**
   * Verify if token is still valid
   */
  public async verifyToken(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ valid: boolean }>(
        '/api/auth/verify'
      );
      return response.success && response.data?.valid === true;
    } catch (error) {
      console.error('[AuthService] Token verification error:', error);
      return false;
    }
  }

  /**
   * Save session to localStorage
   */
  private saveSession(session: AuthSession): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_session', JSON.stringify(session));
      } catch (error) {
        console.error('[AuthService] Failed to save session:', error);
      }
    }
  }

  /**
   * Clear session from localStorage
   */
  private clearSession(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_session');
      } catch (error) {
        console.error('[AuthService] Failed to clear session:', error);
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    const session = this.getSession();
    return session !== null && apiClient.isAuthenticated();
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;
