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
    full_name: '',
  });

  const [settingsData, setSettingsData] = useState({
    university: '',
    field_of_study: '',
    academic_level: '',
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
        full_name: data.full_name || '',
      });
      setSettingsData({
        university: data.university || '',
        field_of_study: data.field_of_study || '',
        academic_level: data.academic_level || '',
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
                <img src={profile.avatar_url} alt={profile.full_name || 'User'} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {(profile.full_name || 'U').charAt(0).toUpperCase()}
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
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />

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
                <span className={styles.infoValue}>{profile.full_name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{profile.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>University</span>
                <span className={styles.infoValue}>{profile.university || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Field of Study</span>
                <span className={styles.infoValue}>{profile.field_of_study || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Academic Level</span>
                <span className={styles.infoValue}>{profile.academic_level || '—'}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Settings Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Academic Profile</h2>

        <div className={styles.settingsCard}>
          <div className={styles.settingItem}>
            <div>
              <p className={styles.settingLabel}>University</p>
              <p className={styles.settingDescription}>
                Optional institution information
              </p>
            </div>
            <input
              type="text"
              value={settingsData.university}
              onChange={(e) =>
                setSettingsData({
                  ...settingsData,
                  university: e.target.value,
                })
              }
              className={styles.select}
              placeholder="e.g., University of Lagos"
            />
          </div>

          <div className={styles.settingItem}>
            <div>
              <p className={styles.settingLabel}>Field of Study</p>
              <p className={styles.settingDescription}>
                Your current major or discipline
              </p>
            </div>
            <input
              type="text"
              value={settingsData.field_of_study}
              onChange={(e) =>
                setSettingsData({
                  ...settingsData,
                  field_of_study: e.target.value,
                })
              }
              className={styles.select}
              placeholder="e.g., Computer Science"
            />
          </div>

          <div className={styles.settingItem}>
            <div>
              <p className={styles.settingLabel}>Academic Level</p>
              <p className={styles.settingDescription}>
                Select your current level
              </p>
            </div>
            <select
              value={settingsData.academic_level}
              onChange={(e) =>
                setSettingsData({
                  ...settingsData,
                  academic_level: e.target.value,
                })
              }
              className={styles.select}
            >
              <option value="">Select level</option>
              <option value="high_school">High School</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="professional">Professional</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <Button variant="primary" onClick={handleSaveSettings} isLoading={isSaving}>
              Save Academic Profile
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
