/**
 * Classrooms List Page
 * Manage all classrooms for teacher or view enrolled classrooms for students
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/forms/Button';
import classroomService, {
  Classroom,
  PaginatedClassrooms,
} from '@/services/classroom_service';
import styles from './page.module.css';

export default function ClassroomsPage() {
  const { isLoading: authLoading } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newClassroom, setNewClassroom] = useState({
    name: '',
    description: '',
    subject: '',
    grade_level: '',
  });
  const [inviteCode, setInviteCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      loadClassrooms();
    }
  }, [authLoading, currentPage]);

  const loadClassrooms = async () => {
    try {
      setIsLoading(true);
      const data = await classroomService.listClassrooms(currentPage, 12);
      setClassrooms(data.items);
      setTotalPages(Math.ceil(data.total / data.per_page));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load classrooms';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClassroom = async () => {
    if (!newClassroom.name.trim()) {
      setError('Classroom name is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      await classroomService.createClassroom(newClassroom);

      setNewClassroom({
        name: '',
        description: '',
        subject: '',
        grade_level: '',
      });
      setShowCreateModal(false);
      loadClassrooms();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create classroom';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinClassroom = async () => {
    if (!inviteCode.trim()) {
      setError('Invite code is required');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      await classroomService.joinClassroomWithCode(inviteCode);

      setInviteCode('');
      setShowJoinModal(false);
      loadClassrooms();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join classroom';
      setError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
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
          <p className={styles.subtitle}>
            Manage and organize your teaching classrooms
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => setShowJoinModal(true)}
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            Join Classroom
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
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
            New Classroom
          </Button>
        </div>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {classrooms.length === 0 ? (
        <div className={styles.emptyState}>
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
              d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
            />
          </svg>
          <h2>No classrooms yet</h2>
          <p>Create a new classroom or join an existing one to get started</p>
          <div className={styles.emptyActions}>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Classroom
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowJoinModal(true)}
            >
              Join Classroom
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.gridContainer}>
            {classrooms.map((classroom) => (
              <a
                key={classroom.id}
                href={`/classrooms/${classroom.id}`}
                className={styles.classroomCard}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{classroom.name}</h3>
                  <span className={styles.badge}>{classroom.subject}</span>
                </div>

                <p className={styles.cardDescription}>{classroom.description}</p>

                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
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
                    <span>{classroom.student_count} students</span>
                  </div>

                  <div className={styles.metaItem}>
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>Grade {classroom.grade_level}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.createdDate}>
                    Created{' '}
                    {new Date(classroom.created_at).toLocaleDateString()}
                  </span>
                  <div className={styles.arrowIcon}>
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Classroom</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateClassroom();
              }}
            >
              <div className={styles.formGroup}>
                <label>Classroom Name *</label>
                <input
                  type="text"
                  value={newClassroom.name}
                  onChange={(e) =>
                    setNewClassroom((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g., Biology 101"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={newClassroom.description}
                  onChange={(e) =>
                    setNewClassroom((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What is this class about?"
                  rows={3}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Subject</label>
                  <input
                    type="text"
                    value={newClassroom.subject}
                    onChange={(e) =>
                      setNewClassroom((p) => ({
                        ...p,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="e.g., Biology"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Grade Level</label>
                  <select
                    value={newClassroom.grade_level}
                    onChange={(e) =>
                      setNewClassroom((p) => ({
                        ...p,
                        grade_level: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select Grade</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                    <option value="college">College</option>
                  </select>
                </div>
              </div>

              <div className={styles.formActions}>
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isCreating}
                >
                  Create Classroom
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Classroom Modal */}
      {showJoinModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Join Classroom</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowJoinModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                handleJoinClassroom();
              }}
            >
              <div className={styles.formGroup}>
                <label>Invite Code *</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter the invite code"
                  maxLength={8}
                />
                <p className={styles.helperText}>
                  Ask your teacher for the classroom invite code
                </p>
              </div>

              <div className={styles.formActions}>
                <Button
                  variant="secondary"
                  onClick={() => setShowJoinModal(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isJoining}
                >
                  Join Classroom
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
