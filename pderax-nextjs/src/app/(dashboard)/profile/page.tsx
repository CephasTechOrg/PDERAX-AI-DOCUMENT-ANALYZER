/**
 * User Profile Page
 * User settings and profile management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import userService, { UserProfile } from '@/services/user_service';
import styles from './page.module.css';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    timezone: 'UTC',
    language: 'en',
  });

  const [settingsData, setSettingsData] = useState({
    theme_preference: 'auto' as 'light' | 'dark' | 'auto',
    notifications_enabled: true,
    email_digest: 'weekly' as 'daily' | 'weekly' | 'never',
  });

  useEffect(() => {
    if (!authLoading) {
      loadProfile();
    }
  }, [authLoading]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await userService.getProfile();
      setProfile(data);
      setFormData({
        name: data.name || '',
        bio: data.bio || '',
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
      });
      setSettingsData({
        theme_preference: data.theme_preference || 'auto',
        notifications_enabled: data.notifications_enabled !== false,
        email_digest: data.email_digest || 'weekly',
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await userService.updateProfile(formData);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      loadProfile();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save profile';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await userService.updateSettings(settingsData);
      setSuccess('Settings updated successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Profile Settings</h1>
        <p className={styles.subtitle}>Manage your account and preferences</p>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {/* Profile Information Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Account Information</h2>
          {!isEditing && (
            <Button
              variant="secondary"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          )}
        </div>

        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.avatarInfo}>
              <p className={styles.email}>{profile.email}</p>
              <p className={styles.role}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </p>
            </div>
          </div>

          {isEditing ? (
            <div className={styles.formGrid}>
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Input
                label="Bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Tell us about yourself"
              />
              <div className={styles.selectField}>
                <label>Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Standard Time</option>
                  <option value="CST">Central Standard Time</option>
                  <option value="MST">Mountain Standard Time</option>
                  <option value="PST">Pacific Standard Time</option>
                </select>
              </div>
              <div className={styles.selectField}>
                <label>Language</label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({ ...formData, language: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <Button
                  variant="primary"
                  onClick={handleSaveProfile}
                  isLoading={isSaving}
                >
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{profile.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{profile.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Timezone</span>
                <span className={styles.infoValue}>{profile.timezone}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Language</span>
                <span className={styles.infoValue}>{profile.language}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Settings Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Preferences</h2>

        <div className={styles.settingsCard}>
          <div className={styles.settingItem}>
            <div>
              <p className={styles.settingLabel}>Theme</p>
              <p className={styles.settingDescription}>
                Choose your preferred interface theme
              </p>
            </div>
            <select
              value={settingsData.theme_preference}
              onChange={(e) =>
                setSettingsData({
                  ...settingsData,
                  theme_preference: e.target.value as
                    | 'light'
                    | 'dark'
                    | 'auto',
                })
              }
              className={styles.select}
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div>
              <p className={styles.settingLabel}>Notifications</p>
              <p className={styles.settingDescription}>
                Receive notifications about your activity
              </p>
            </div>
            <input
              type="checkbox"
              checked={settingsData.notifications_enabled}
              onChange={(e) =>
                setSettingsData({
                  ...settingsData,
                  notifications_enabled: e.target.checked,
                })
              }
              className={styles.checkbox}
            />
          </div>

          <div className={styles.settingItem}>
            <div>
              <p className={styles.settingLabel}>Email Digest</p>
              <p className={styles.settingDescription}>
                How often to receive email updates
              </p>
            </div>
            <select
              value={settingsData.email_digest}
              onChange={(e) =>
                setSettingsData({
                  ...settingsData,
                  email_digest: e.target.value as
                    | 'daily'
                    | 'weekly'
                    | 'never',
                })
              }
              className={styles.select}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <Button variant="primary" onClick={handleSaveSettings} isLoading={isSaving}>
              Save Preferences
            </Button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Danger Zone</h2>
        <div className={styles.dangerCard}>
          <div>
            <p className={styles.dangerTitle}>Delete Account</p>
            <p className={styles.dangerDescription}>
              Permanently delete your account and all associated data
            </p>
          </div>
          <Button variant="danger">Delete Account</Button>
        </div>
      </section>
    </div>
  );
}
