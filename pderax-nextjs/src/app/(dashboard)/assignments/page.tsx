/**
 * Assignments Page
 * View and manage assignments for a classroom
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/forms/Button';
import assignmentService, {
  Assignment,
  PaginatedAssignments,
} from '@/services/assignment_service';
import styles from './page.module.css';

export default function AssignmentsPage() {
  const params = useParams();
  const classroomId = params.id as string;
  const { isLoading: authLoading } = useAuth();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    due_date: '',
    points_possible: 100,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!authLoading) {
      loadAssignments();
    }
  }, [authLoading, currentPage, filterStatus]);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      const data = await assignmentService.listAssignments(
        classroomId,
        currentPage,
        12
      );

      let filtered = data.items;
      if (filterStatus !== 'all') {
        filtered = filtered.filter((a) => a.status === filterStatus);
      }

      setAssignments(filtered);
      setTotalPages(Math.ceil(data.total / data.per_page));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load assignments';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim()) {
      setError('Assignment title is required');
      return;
    }

    if (!newAssignment.due_date) {
      setError('Due date is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      await assignmentService.createAssignment(classroomId, {
        title: newAssignment.title,
        description: newAssignment.description,
        due_date: new Date(newAssignment.due_date).toISOString(),
        points_possible: newAssignment.points_possible,
        settings: {
          allow_late_submission: true,
          late_penalty_percent: 10,
          allow_resubmission: true,
          anonymous_grading: false,
          rubric_enabled: false,
          peer_review_enabled: false,
        },
      });

      setNewAssignment({
        title: '',
        description: '',
        due_date: '',
        points_possible: 100,
      });
      setShowCreateModal(false);
      loadAssignments();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create assignment';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return '#10b981';
      case 'draft':
        return '#f59e0b';
      case 'closed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <a href={`/classrooms/${classroomId}`} className={styles.backLink}>
            ← Back to Classroom
          </a>
          <h1 className={styles.title}>Assignments</h1>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
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
          New Assignment
        </Button>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Filters */}
      <div className={styles.filters}>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          className={styles.filterSelect}
        >
          <option value="all">All Assignments</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {assignments.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2>No assignments</h2>
          <p>Create your first assignment to get started</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            Create Assignment
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.assignmentsList}>
            {assignments.map((assignment) => (
              <a
                key={assignment.id}
                href={`/classrooms/${classroomId}/assignments/${assignment.id}`}
                className={styles.assignmentCard}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{assignment.title}</h3>
                  <span
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(assignment.status) }}
                  >
                    {assignment.status}
                  </span>
                </div>

                <p className={styles.cardDescription}>{assignment.description}</p>

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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{new Date(assignment.due_date).toLocaleDateString()}</span>
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{assignment.submission_count} submissions</span>
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
                    <span>{assignment.points_possible} points</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.gradingProgress}>
                    <div className={styles.progressLabel}>
                      <span>Grading Progress</span>
                      <span className={styles.progressValue}>
                        {assignment.graded_count}/{assignment.submission_count}
                      </span>
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: assignment.submission_count
                            ? `${(assignment.graded_count / assignment.submission_count) * 100}%`
                            : '0%',
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

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

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create Assignment</h2>
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
                handleCreateAssignment();
              }}
            >
              <div className={styles.formGroup}>
                <label>Assignment Title *</label>
                <input
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) =>
                    setNewAssignment((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g., Chapter 3 Quiz"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) =>
                    setNewAssignment((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What should students do?"
                  rows={4}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Due Date *</label>
                  <input
                    type="datetime-local"
                    value={newAssignment.due_date}
                    onChange={(e) =>
                      setNewAssignment((p) => ({
                        ...p,
                        due_date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Points Possible</label>
                  <input
                    type="number"
                    value={newAssignment.points_possible}
                    onChange={(e) =>
                      setNewAssignment((p) => ({
                        ...p,
                        points_possible: parseInt(e.target.value, 10),
                      }))
                    }
                    min="1"
                  />
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
                  Create Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
