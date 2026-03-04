/**
 * Classroom Details Page
 * View classroom, manage settings, and manage students
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Copy, UserPlus, Users, Trash2, ArrowLeft, Loader2,
  Settings, BookOpen, ChevronLeft, ChevronRight,
} from 'lucide-react';
import classroomService, {
  Classroom,
  StudentInClassroom,
  ClassroomSettings,
} from '@/services/classroom_service';
import styles from './page.module.css';

type Tab = 'overview' | 'settings' | 'students';

export default function ClassroomDetailsPage() {
  const params = useParams();
  const router = useRouter();
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
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
      setSettings(data.settings ?? null);

      const codes = await classroomService.getInviteCodes(classroomId);
      if (codes.length > 0) {
        setInviteCode(codes[0].invite_code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classroom');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!classroom) return;
    try {
      const data = await classroomService.getClassroomStudents(classroomId, currentPage, 15);
      setStudents(data.items);
      setTotalPages(Math.ceil(data.total / data.per_page));
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const handleUpdateSettings = async () => {
    if (!settings) return;
    try {
      setIsSavingSettings(true);
      setError(null);
      await classroomService.updateClassroomSettings(classroomId, settings);
      setIsEditingSettings(false);
      loadClassroom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleInviteStudent = async () => {
    if (!inviteEmail.trim()) { setError('Email is required'); return; }
    try {
      setIsInviting(true);
      setError(null);
      await classroomService.inviteStudent(classroomId, inviteEmail);
      setInviteEmail('');
      setShowInviteModal(false);
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite student');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student?')) return;
    try {
      setError(null);
      await classroomService.removeStudent(classroomId, studentId);
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove student');
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
          <Loader2 size={36} className={styles.spinner} />
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
          <button className={styles.backLink} onClick={() => router.push('/classrooms')}>
            <ArrowLeft size={14} />
            Back to Classrooms
          </button>
          <h1 className={styles.title}>{classroom.name}</h1>
          <p className={styles.subtitle}>{classroom.description}</p>
        </div>
      </header>

      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BookOpen size={14} /> Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'students' ? styles.active : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <Users size={14} /> Students ({classroom.student_count})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={14} /> Settings
        </button>
      </nav>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          <div className={styles.grid}>
            {/* Classroom Info */}
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

            {/* Invite Code */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Invite Code</h2>
              <div className={styles.inviteCodeContainer}>
                <div className={styles.inviteCodeDisplay}>
                  <code>{inviteCode || 'No invite code'}</code>
                  {inviteCode && (
                    <button className={styles.copyBtn} onClick={handleCopyInviteCode}>
                      <Copy size={14} /> Copy
                    </button>
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
                <button className={styles.actionBtn} onClick={() => setShowInviteModal(true)}>
                  <UserPlus size={16} /> Invite Student
                </button>
                <button className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={() => setActiveTab('students')}>
                  <Users size={16} /> Manage Students
                </button>
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
            <button className={styles.actionBtn} onClick={() => setShowInviteModal(true)}>
              <UserPlus size={15} /> Invite Student
            </button>
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
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight size={16} />
              </button>
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
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnSecondary} ${styles.actionBtnSm}`}
                  onClick={() => setIsEditingSettings(true)}
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingSettings ? (
              <form
                className={styles.settingsForm}
                onSubmit={(e) => { e.preventDefault(); handleUpdateSettings(); }}
              >
                {[
                  { key: 'allow_student_uploads', label: 'Allow students to upload documents' },
                  { key: 'allow_peer_review', label: 'Enable peer review' },
                  { key: 'anonymous_feedback', label: 'Allow anonymous feedback' },
                  { key: 'email_notifications', label: 'Send email notifications' },
                  { key: 'auto_grading_enabled', label: 'Enable automatic grading' },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.settingItem}>
                    <label className={styles.settingLabel}>
                      <input
                        type="checkbox"
                        checked={(settings as any)[key]}
                        onChange={(e) =>
                          setSettings((prev) => prev ? { ...prev, [key]: e.target.checked } : null)
                        }
                      />
                      <span>{label}</span>
                    </label>
                  </div>
                ))}

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                    onClick={() => { setIsEditingSettings(false); loadClassroom(); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.actionBtn} disabled={isSavingSettings}>
                    {isSavingSettings ? <Loader2 size={14} className={styles.spinIcon} /> : null}
                    Save Settings
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.settingsList}>
                {[
                  { key: 'allow_student_uploads', label: 'Allow students to upload documents' },
                  { key: 'allow_peer_review', label: 'Enable peer review' },
                  { key: 'anonymous_feedback', label: 'Allow anonymous feedback' },
                  { key: 'email_notifications', label: 'Send email notifications' },
                  { key: 'auto_grading_enabled', label: 'Enable automatic grading' },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.settingItem}>
                    <span>{label}</span>
                    <input type="checkbox" checked={(settings as any)[key]} disabled />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className={styles.modal}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
        >
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Invite Student</h2>
              <button className={styles.closeButton} onClick={() => setShowInviteModal(false)}>✕</button>
            </div>

            <form
              className={styles.form}
              onSubmit={(e) => { e.preventDefault(); handleInviteStudent(); }}
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
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.actionBtn} disabled={isInviting}>
                  {isInviting
                    ? <><Loader2 size={14} className={styles.spinIcon} /> Sending...</>
                    : <><UserPlus size={14} /> Send Invite</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
