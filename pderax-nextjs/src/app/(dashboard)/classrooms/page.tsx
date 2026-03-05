/**
 * Classrooms List Page
 * Manage all classrooms for teacher or view enrolled classrooms for students
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import classroomService, { Classroom } from '@/services/classroom_service';
import {
  Plus, Users, Zap, ChevronRight, Loader2,
  BookOpen, X, UserPlus, GraduationCap,
} from 'lucide-react';
import styles from './page.module.css';

export default function ClassroomsPage() {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [selectedCreatorRole, setSelectedCreatorRole] = useState<'teacher' | 'student'>('teacher');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newClassroom, setNewClassroom] = useState({
    name: '', description: '', subject: '', grade_level: 'college',
  });
  const [inviteCode, setInviteCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) loadClassrooms();
  }, [authLoading, currentPage]);

  const loadClassrooms = async () => {
    try {
      setIsLoading(true);
      const data = await classroomService.listClassrooms(currentPage, 12);
      setClassrooms(data.items);
      setTotalPages(Math.ceil(data.total / data.per_page));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClassroom = async () => {
    if (!newClassroom.name.trim()) { setError('Classroom name is required'); return; }
    if (!newClassroom.subject.trim()) { setError('Subject is required'); return; }
    try {
      setIsCreating(true); setError(null);
      const created = await classroomService.createClassroom({
        ...newClassroom,
        creator_role: selectedCreatorRole,
      });
      setNewClassroom({ name: '', description: '', subject: '', grade_level: 'college' });
      setCreateStep(1);
      setShowCreateModal(false);
      setCreatedInviteCode(created.invite_code);
      loadClassrooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create classroom');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinClassroom = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) { setError('Invite code is required'); return; }
    try {
      setIsJoining(true); setError(null);
      await classroomService.joinClassroomWithCode(code);
      setInviteCode('');
      setShowJoinModal(false);
      loadClassrooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join classroom');
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 size={36} className={styles.spinner} />
          <p>Loading classrooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Classrooms</h1>
          <p className={styles.subtitle}>Manage and collaborate in your classrooms</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.joinBtn} onClick={() => setShowJoinModal(true)}>
            <UserPlus size={16} /> Join
          </button>
          <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> New Classroom
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorMessage}>
          <span>{error}</span>
          <button className={styles.errorClose} onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Invite code banner shown after classroom creation */}
      {createdInviteCode && (
        <div className={styles.inviteBanner}>
          <div className={styles.inviteBannerLeft}>
            <GraduationCap size={20} className={styles.inviteBannerIcon} />
            <div>
              <p className={styles.inviteBannerTitle}>Classroom created!</p>
              <p className={styles.inviteBannerSub}>Share this invite code with students to join:</p>
            </div>
          </div>
          <div className={styles.inviteCodeBox}>
            <span className={styles.inviteCodeText}>{createdInviteCode}</span>
            <button
              className={styles.copyCodeBtn}
              onClick={() => {
                navigator.clipboard.writeText(createdInviteCode);
              }}
              title="Copy code"
            >
              Copy
            </button>
          </div>
          <button className={styles.errorClose} onClick={() => setCreatedInviteCode(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {classrooms.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><GraduationCap size={40} /></div>
          <h2>No classrooms yet</h2>
          <p>Create a new classroom or join an existing one to get started</p>
          <div className={styles.emptyActions}>
            <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Create Classroom
            </button>
            <button className={styles.joinBtn} onClick={() => setShowJoinModal(true)}>
              <UserPlus size={16} /> Join Classroom
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.gridContainer}>
            {classrooms.map((classroom) => (
              <a key={classroom.id} href={`/classrooms/${classroom.id}`} className={styles.classroomCard}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIconWrap}>
                    <BookOpen size={22} />
                  </div>
                  <span className={styles.badge}>{classroom.subject}</span>
                </div>

                <h3 className={styles.cardTitle}>{classroom.name}</h3>
                {classroom.description && (
                  <p className={styles.cardDescription}>{classroom.description}</p>
                )}

                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
                    <Users size={14} />
                    <span>{classroom.student_count} students</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Zap size={14} />
                    <span>Grade {classroom.grade_level}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.createdDate}>
                    {new Date(classroom.created_at).toLocaleDateString()}
                  </span>
                  <ChevronRight size={18} className={styles.arrowIcon} />
                </div>
              </a>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Classroom Modal — 2-step */}
      {showCreateModal && (
        <div className={styles.modal} onClick={(e) => {
          if (e.target === e.currentTarget) { setShowCreateModal(false); setCreateStep(1); }
        }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{createStep === 1 ? 'Your Role' : 'Create Classroom'}</h2>
              <button className={styles.closeButton} onClick={() => { setShowCreateModal(false); setCreateStep(1); }}>
                <X size={20} />
              </button>
            </div>

            {/* Step 1 — role selection */}
            {createStep === 1 && (
              <div className={styles.roleStep}>
                <p className={styles.roleStepSubtitle}>How will you use this classroom?</p>
                <div className={styles.roleCards}>
                  <button
                    className={`${styles.roleCard} ${selectedCreatorRole === 'teacher' ? styles.roleCardActive : ''}`}
                    onClick={() => setSelectedCreatorRole('teacher')}
                    type="button"
                  >
                    <GraduationCap size={28} className={styles.roleIcon} />
                    <span className={styles.roleCardTitle}>Teacher</span>
                    <span className={styles.roleCardDesc}>Full control — manage assignments, grades, and students</span>
                  </button>
                  <button
                    className={`${styles.roleCard} ${selectedCreatorRole === 'student' ? styles.roleCardActive : ''}`}
                    onClick={() => setSelectedCreatorRole('student')}
                    type="button"
                  >
                    <Users size={28} className={styles.roleIcon} />
                    <span className={styles.roleCardTitle}>Student</span>
                    <span className={styles.roleCardDesc}>Study group — collaborate with peers on shared materials</span>
                  </button>
                </div>
                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => { setShowCreateModal(false); setCreateStep(1); }}>
                    Cancel
                  </button>
                  <button type="button" className={styles.submitBtn} onClick={() => setCreateStep(2)}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — creation form */}
            {createStep === 2 && (
              <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleCreateClassroom(); }}>
                <div className={styles.formGroup}>
                  <label>Classroom Name *</label>
                  <input type="text" value={newClassroom.name}
                    onChange={(e) => setNewClassroom((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Biology 101" />
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea value={newClassroom.description} rows={3}
                    onChange={(e) => setNewClassroom((p) => ({ ...p, description: e.target.value }))}
                    placeholder="What is this class about?" />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Subject *</label>
                    <input type="text" value={newClassroom.subject}
                      onChange={(e) => setNewClassroom((p) => ({ ...p, subject: e.target.value }))}
                      placeholder="e.g., Biology" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Grade Level</label>
                    <select value={newClassroom.grade_level}
                      onChange={(e) => setNewClassroom((p) => ({ ...p, grade_level: e.target.value }))}>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                      <option value="college">College</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setCreateStep(1)}>
                    ← Back
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={isCreating}>
                    {isCreating ? <Loader2 size={16} className={styles.spinner} /> : <Plus size={16} />}
                    {isCreating ? 'Creating...' : 'Create Classroom'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Join Classroom Modal */}
      {showJoinModal && (
        <div className={styles.modal} onClick={(e) => e.target === e.currentTarget && setShowJoinModal(false)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Join Classroom</h2>
              <button className={styles.closeButton} onClick={() => setShowJoinModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleJoinClassroom(); }}>
              <div className={styles.formGroup}>
                <label>Invite Code *</label>
                <input type="text" value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.trim().toUpperCase())}
                  placeholder="Enter invite code" maxLength={8} />
                <p className={styles.helperText}>Ask your teacher for the classroom invite code</p>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isJoining}>
                  {isJoining ? <Loader2 size={16} className={styles.spinner} /> : <UserPlus size={16} />}
                  {isJoining ? 'Joining...' : 'Join Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
