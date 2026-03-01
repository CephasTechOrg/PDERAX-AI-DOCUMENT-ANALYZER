/**
 * User Profile Service
 * Handles user profile management and settings
 */

import apiClient from './api';
import { User } from '@/types';

export interface UserProfile extends User {
  bio?: string;
  timezone?: string;
  language?: string;
  theme_preference?: 'light' | 'dark' | 'auto';
  notifications_enabled?: boolean;
  email_digest?: 'daily' | 'weekly' | 'never';
  two_factor_enabled?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  avatar_url?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateSettingsRequest {
  theme_preference?: 'light' | 'dark' | 'auto';
  notifications_enabled?: boolean;
  email_digest?: 'daily' | 'weekly' | 'never';
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

class UserProfileService {
  /**
   * Get current user's full profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/api/v1/auth/me');
    return response;
  }

  /**
   * Update user profile information
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>('/api/v1/auth/profile', data);
    return response;
  }

  /**
   * Update user settings
   */
  async updateSettings(data: UpdateSettingsRequest): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>('/api/v1/auth/profile', data);
    return response;
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const response = await apiClient.upload<{ avatar_url: string }>(
      '/api/v1/user/avatar',
      file,
      { avatar: file.name }
    );
    return response;
  }

  /**
   * Change password
   */
  async changePassword(data: PasswordChangeRequest): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/v1/user/change-password',
      data
    );
    return response;
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(): Promise<{ qr_code: string; secret: string }> {
    const response = await apiClient.post<{ qr_code: string; secret: string }>(
      '/api/v1/user/two-factor/enable',
      {}
    );
    return response;
  }

  /**
   * Verify two-factor authentication setup
   */
  async verifyTwoFactor(code: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/v1/user/two-factor/verify',
      { code }
    );
    return response;
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(password: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/v1/user/two-factor/disable',
      { password }
    );
    return response;
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UpdateSettingsRequest> {
    const response = await apiClient.get<UpdateSettingsRequest>(
      '/api/v1/user/preferences'
    );
    return response;
  }

  /**
   * Delete user account (with password confirmation)
   */
  async deleteAccount(password: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/v1/user/delete-account',
      { password }
    );
    return response;
  }

  /**
   * Get user sessions
   */
  async getSessions(): Promise<{
    current_session: { device: string; last_active: string };
    other_sessions: Array<{ id: string; device: string; last_active: string }>;
  }> {
    const response = await apiClient.get<{
      current_session: { device: string; last_active: string };
      other_sessions: Array<{ id: string; device: string; last_active: string }>;
    }>('/api/v1/user/sessions');
    return response;
  }

  /**
   * Logout from all other sessions
   */
  async logoutOtherSessions(): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/v1/user/logout-other-sessions',
      {}
    );
    return response;
  }
}

export default new UserProfileService();
