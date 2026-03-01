/**
 * Classroom Details Page
 * View classroom, manage settings, and manage students
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/forms/Button';
import classroomService, {
  Classroom,
  StudentInClassroom,
  ClassroomSettings,
  PaginatedStudents,
} from '@/services/classroom_service';
import styles from './page.module.css';

type Tab = 'overview' | 'settings' | 'students';

export default function ClassroomDetailsPage() {
  const params = useParams();
  const classroomId = params.id as string;
  const { isLoading: authLoading } = useAuth();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<StudentInClassroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settings, setSettings] = useState<ClassroomSettings | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading) {
      loadClassroom();
    }
  }, [authLoading]);

  useEffect(() => {
    if (classroom) {
      loadStudents();
    }
  }, [classroom, currentPage]);

  const loadClassroom = async () => {
    try {
      setIsLoading(true);
      const data = await classroomService.getClassroom(classroomId);
      setClassroom(data);
      setSettings(data.settings);

      // Get invite code
      const codes = await classroomService.getInviteCodes(classroomId);
      if (codes.length > 0) {
        setInviteCode(codes[0].invite_code);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load classroom';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!classroom) return;

    try {
      const data = await classroomService.getClassroomStudents(
        classroomId,
        currentPage,
        15
      );
      setStudents(data.items);
      setTotalPages(Math.ceil(data.total / data.per_page));
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const handleUpdateSettings = async () => {
    if (!settings) return;

    try {
      setError(null);
      await classroomService.updateClassroomSettings(classroomId, settings);
      setIsEditingSettings(false);
      loadClassroom();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
    }
  };

  const handleInviteStudent = async () => {
    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setIsInviting(true);
      setError(null);
      await classroomService.inviteStudent(classroomId, inviteEmail);
      setInviteEmail('');
      setShowInviteModal(false);
      loadStudents();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to invite student';
      setError(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student?')) {
      return;
    }

    try {
      setError(null);
      await classroomService.removeStudent(classroomId, studentId);
      loadStudents();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to remove student';
      setError(errorMessage);
    }
  };

  const handleCopyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      alert('Invite code copied to clipboard!');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Classroom not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <a href="/classrooms" className={styles.backLink}>
            ← Back to Classrooms
          </a>
          <h1 className={styles.title}>{classroom.name}</h1>
          <p className={styles.subtitle}>{classroom.description}</p>
        </div>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'students' ? styles.active : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Students ({classroom.student_count})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          <div className={styles.grid}>
            {/* Classroom Info Card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Classroom Information</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Subject</span>
                  <span className={styles.value}>{classroom.subject}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Grade Level</span>
                  <span className={styles.value}>{classroom.grade_level}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Total Students</span>
                  <span className={styles.value}>{classroom.student_count}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Created</span>
                  <span className={styles.value}>
                    {new Date(classroom.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Invite Code Card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Invite Code</h2>
              <div className={styles.inviteCodeContainer}>
                <div className={styles.inviteCodeDisplay}>
                  <code>{inviteCode || 'No invite code'}</code>
                  {inviteCode && (
                    <Button
                      variant="secondary"
                      onClick={handleCopyInviteCode}
                      size="sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </Button>
                  )}
                </div>
                <p className={styles.helperText}>
                  Share this code with students to let them join the classroom
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Quick Actions</h2>
              <div className={styles.actionButtons}>
                <Button
                  variant="primary"
                  onClick={() => setShowInviteModal(true)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Invite Student
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('students')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Manage Students
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className={styles.tabContent}>
          <div className={styles.studentsHeader}>
            <h2>Students ({classroom.student_count})</h2>
            <Button
              variant="primary"
              onClick={() => setShowInviteModal(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Invite Student
            </Button>
          </div>

          {students.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No students in this classroom yet</p>
            </div>
          ) : (
            <div className={styles.studentsList}>
              {students.map((student) => (
                <div key={student.id} className={styles.studentItem}>
                  <div className={styles.studentInfo}>
                    <div className={styles.studentAvatar}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.studentDetails}>
                      <div className={styles.studentName}>{student.name}</div>
                      <div className={styles.studentEmail}>{student.email}</div>
                    </div>
                  </div>

                  <div className={styles.studentStatus}>
                    <span className={`${styles.badge} ${styles[`badge-${student.status}`]}`}>
                      {student.status}
                    </span>
                  </div>

                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemoveStudent(student.id)}
                    title="Remove student"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span>Page {currentPage} of {totalPages}</span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className={styles.tabContent}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Classroom Settings</h2>
              {!isEditingSettings && (
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingSettings(true)}
                  size="sm"
                >
                  Edit
                </Button>
              )}
            </div>

            {isEditingSettings ? (
              <form
                className={styles.settingsForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateSettings();
                }}
              >
                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    <input
                      type="checkbox"
                      checked={settings.allow_student_uploads}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                allow_student_uploads: e.target.checked,
                              }
                            : null
                        )
                      }
                    />
                    <span>Allow students to upload documents</span>
                  </label>
                </div>

                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    <input
                      type="checkbox"
                      checked={settings.allow_peer_review}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? { ...prev, allow_peer_review: e.target.checked }
                            : null
                        )
                      }
                    />
                    <span>Enable peer review</span>
                  </label>
                </div>

                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    <input
                      type="checkbox"
                      checked={settings.anonymous_feedback}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                anonymous_feedback: e.target.checked,
                              }
                            : null
                        )
                      }
                    />
                    <span>Allow anonymous feedback</span>
                  </label>
                </div>

                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    <input
                      type="checkbox"
                      checked={settings.email_notifications}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                email_notifications: e.target.checked,
                              }
                            : null
                        )
                      }
                    />
                    <span>Send email notifications</span>
                  </label>
                </div>

                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    <input
                      type="checkbox"
                      checked={settings.auto_grading_enabled}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                auto_grading_enabled: e.target.checked,
                              }
                            : null
                        )
                      }
                    />
                    <span>Enable automatic grading</span>
                  </label>
                </div>

                <div className={styles.formActions}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditingSettings(false);
                      loadClassroom();
                    }}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Save Settings
                  </Button>
                </div>
              </form>
            ) : (
              <div className={styles.settingsList}>
                <div className={styles.settingItem}>
                  <span>Allow students to upload documents</span>
                  <input
                    type="checkbox"
                    checked={settings.allow_student_uploads}
                    disabled
                  />
                </div>
                <div className={styles.settingItem}>
                  <span>Enable peer review</span>
                  <input
                    type="checkbox"
                    checked={settings.allow_peer_review}
                    disabled
                  />
                </div>
                <div className={styles.settingItem}>
                  <span>Allow anonymous feedback</span>
                  <input
                    type="checkbox"
                    checked={settings.anonymous_feedback}
                    disabled
                  />
                </div>
                <div className={styles.settingItem}>
                  <span>Send email notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    disabled
                  />
                </div>
                <div className={styles.settingItem}>
                  <span>Enable automatic grading</span>
                  <input
                    type="checkbox"
                    checked={settings.auto_grading_enabled}
                    disabled
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Invite Student</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowInviteModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                handleInviteStudent();
              }}
            >
              <div className={styles.formGroup}>
                <label>Student Email *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="student@example.com"
                />
              </div>

              <div className={styles.formActions}>
                <Button
                  variant="secondary"
                  onClick={() => setShowInviteModal(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isInviting}
                >
                  Send Invite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
