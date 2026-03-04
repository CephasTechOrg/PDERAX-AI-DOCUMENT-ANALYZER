/**
 * User Profile Service
 * Handles user profile management and settings
 */

import apiClient from './api';
import { User } from '@/types';

export interface UserProfile extends User {
  university?: string | null;
  field_of_study?: string | null;
  academic_level?: string | null;
}

export interface UpdateProfileRequest {
  full_name?: string;
  avatar_url?: string;
  university?: string;
  field_of_study?: string;
  academic_level?: string;
}

export interface UpdateSettingsRequest {
  university?: string;
  field_of_study?: string;
  academic_level?: string;
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
}

export default new UserProfileService();
