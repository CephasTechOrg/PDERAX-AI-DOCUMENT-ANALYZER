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
  public async signup(data: SignupRequest): Promise<{ message: string }> {
    try {
      // Backend returns MessageResponse (not a session) after registration
      // User must verify email before they can log in
      const response = await apiClient.post<{ message: string }>(
        '/api/v1/auth/register',
        data
      );
      return response;
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
      // Backend returns TokenResponse: { access_token, refresh_token, expires_in, user }
      const response = await apiClient.post<AuthSession>(
        '/api/v1/auth/login',
        data
      );

      // Build session with computed absolute expiry for client-side checks
      const session: AuthSession = {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_in: response.expires_in,
        expires_at: Date.now() + response.expires_in * 1000,
        user: response.user,
      };

      this.saveSession(session);
      apiClient.setToken(session.access_token);
      return session;
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user and clear session
   */
  public async logout(): Promise<void> {
    // JWT is stateless — logout is purely client-side (no backend logout endpoint)
    this.clearSession();
    apiClient.clearToken();
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

      // Check if session has expired (expires_at is absolute ms timestamp)
      if (session.expires_at && session.expires_at < Date.now()) {
        this.clearSession();
        apiClient.clearToken();
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
        '/api/v1/auth/refresh',
        {
          refresh_token: session.refresh_token,
        }
      );

      const newSession: AuthSession = {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_in: response.expires_in,
        expires_at: Date.now() + response.expires_in * 1000,
        user: response.user,
      };

      this.saveSession(newSession);
      apiClient.setToken(newSession.access_token);
      return newSession;
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
      // Use the health endpoint as a lightweight auth check
      await apiClient.get<unknown>('/api/v1/auth/me');
      return true;
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
