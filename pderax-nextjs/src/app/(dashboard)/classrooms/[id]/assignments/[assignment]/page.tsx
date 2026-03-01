/**
 * Assignment Detail Page
 * View assignment, submit as student, or grade submissions as teacher
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/forms/Button';
import assignmentService, {
  Assignment,
  Submission,
  GradeRequest,
} from '@/services/assignment_service';
import styles from './page.module.css';

type TabType = 'overview' | 'submissions' | 'submissions-detail';

interface SubmissionWithGrade extends Submission {
  student_name?: string;
  student_email?: string;
}

export default function AssignmentDetailPage() {
  const params = useParams();
  const classroomId = params.id as string;
  const assignmentId = params.assignment as string;
  const { user, isLoading: authLoading } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithGrade[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithGrade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradeData, setGradeData] = useState({
    points: 0,
    feedback: '',
  });
  const [isGrading, setIsGrading] = useState(false);
  const [submissionPage, setSubmissionPage] = useState(1);
  const [totalSubmissionPages, setTotalSubmissionPages] = useState(1);

  useEffect(() => {
    if (!authLoading) {
      loadAssignment();
      loadMySubmission();
    }
  }, [authLoading]);

  useEffect(() => {
    if (assignment && isTeacher()) {
      loadSubmissions();
    }
  }, [assignment, submissionPage]);

  const isTeacher = () => {
    return user?.role === 'teacher' || user?.role === 'admin';
  };

  const loadAssignment = async () => {
    try {
      setIsLoading(true);
      const data = await assignmentService.getAssignment(
        classroomId,
        assignmentId
      );
      setAssignment(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load assignment';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMySubmission = async () => {
    try {
      const data = await assignmentService.getMySubmission(
        classroomId,
        assignmentId
      );
      setMySubmission(data);
    } catch (err) {
      // No submission yet is not an error
      setMySubmission(null);
    }
  };

  const loadSubmissions = async () => {
    try {
      const data = await assignmentService.getSubmissions(
        classroomId,
        assignmentId,
        submissionPage,
        12
      );
      setSubmissions(data.items);
      setTotalSubmissionPages(Math.ceil(data.total / data.per_page));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load submissions';
      setError(errorMessage);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!submissionContent.trim() && !submissionFile) {
      setError('Please provide submission content or a file');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('content', submissionContent);
      if (submissionFile) {
        formData.append('file', submissionFile);
      }

      await assignmentService.submitAssignment(
        classroomId,
        assignmentId,
        {
          content: submissionContent,
        }
      );

      setSubmissionContent('');
      setSubmissionFile(null);
      loadMySubmission();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to submit assignment';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    try {
      setIsGrading(true);
      setError(null);

      const gradeRequest: GradeRequest = {
        points: gradeData.points,
        feedback: gradeData.feedback,
        status: 'graded',
      };

      await assignmentService.gradeSubmission(
        classroomId,
        assignmentId,
        selectedSubmission.id,
        gradeRequest
      );

      setGradeData({ points: 0, feedback: '' });
      setSelectedSubmission(null);
      loadSubmissions();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to grade submission';
      setError(errorMessage);
    } finally {
      setIsGrading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSubmissionStatus = (submission: Submission) => {
    if (submission.status === 'graded') return 'Graded';
    if (submission.status === 'submitted') return 'Pending Review';
    return submission.status;
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>Assignment not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <a href={`/classrooms/${classroomId}/assignments`} className={styles.backLink}>
        ← Back to Assignments
      </a>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{assignment.title}</h1>
          <p className={styles.description}>{assignment.description}</p>

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Due Date:</span>
              <span>{formatDate(assignment.due_date)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Points:</span>
              <span>{assignment.points_possible}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Status:</span>
              <span className={styles.statusBadge}>{assignment.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        {!isTeacher() && (
          <button
            className={`${styles.tab} ${activeTab === 'submissions' ? styles.active : ''}`}
            onClick={() => setActiveTab('submissions')}
          >
            My Submission
          </button>
        )}
        {isTeacher() && (
          <button
            className={`${styles.tab} ${activeTab === 'submissions' ? styles.active : ''}`}
            onClick={() => setActiveTab('submissions')}
          >
            Submissions ({assignment.submission_count})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles.overviewTab}>
            <div className={styles.infoCard}>
              <h2>Assignment Details</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Total Points</span>
                  <span className={styles.infoValue}>
                    {assignment.points_possible}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Submissions</span>
                  <span className={styles.infoValue}>
                    {assignment.submission_count}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Graded</span>
                  <span className={styles.infoValue}>
                    {assignment.graded_count}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Status</span>
                  <span className={styles.infoValue}>{assignment.status}</span>
                </div>
              </div>
            </div>

            {!isTeacher() && (
              <div className={styles.infoCard}>
                <h2>Instructions</h2>
                <p className={styles.instructions}>
                  {assignment.description ||
                    'No additional instructions provided.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Student Submission Tab */}
        {!isTeacher() && activeTab === 'submissions' && (
          <div className={styles.submissionTab}>
            {mySubmission ? (
              <div className={styles.submissionCard}>
                <div className={styles.submissionHeader}>
                  <h3>Your Submission</h3>
                  <span
                    className={`${styles.submissionStatus} ${styles[mySubmission.status]}`}
                  >
                    {getSubmissionStatus(mySubmission)}
                  </span>
                </div>

                <div className={styles.submissionMeta}>
                  <div className={styles.metaItem}>
                    <span>Submitted:</span>
                    <span>{formatDate(mySubmission.submitted_at)}</span>
                  </div>
                  {mySubmission.grade !== null && (
                    <div className={styles.metaItem}>
                      <span>Grade:</span>
                      <span className={styles.grade}>
                        {mySubmission.grade}/{assignment.points_possible}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.submissionContent}>
                  <h4>Your Answer:</h4>
                  <p>{mySubmission.content}</p>
                </div>

                {mySubmission.feedback && (
                  <div className={styles.feedbackSection}>
                    <h4>Teacher Feedback:</h4>
                    <div className={styles.feedback}>{mySubmission.feedback}</div>
                  </div>
                )}

                {mySubmission.status === 'submitted' && (
                  <p className={styles.note}>
                    This submission is pending review. Your teacher will grade it
                    soon.
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.noSubmissionCard}>
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
                    d="M12 9v2m0 4v2m0 0v2m0-6v2m0 0v2"
                  />
                </svg>
                <h3>No Submission Yet</h3>
                <p>Submit your assignment below</p>
              </div>
            )}

            <form
              className={styles.submissionForm}
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitAssignment();
              }}
            >
              <h3>Submit Assignment</h3>

              <div className={styles.formGroup}>
                <label>Your Answer *</label>
                <textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={6}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Upload File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className={styles.fileInput}
                />
              </div>

              <Button
                variant="primary"
                type="submit"
                isLoading={isSubmitting}
                disabled={!submissionContent.trim() && !submissionFile}
              >
                Submit Assignment
              </Button>
            </form>
          </div>
        )}

        {/* Teacher Submissions List */}
        {isTeacher() && activeTab === 'submissions' && (
          <div className={styles.submissionsListTab}>
            <div className={styles.submissionsList}>
              {submissions.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No submissions yet</p>
                </div>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`${styles.submissionItem} ${selectedSubmission?.id === submission.id ? styles.selected : ''}`}
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setActiveTab('submissions');
                    }}
                  >
                    <div className={styles.submissionItemHeader}>
                      <span className={styles.studentName}>
                        {submission.student_name || 'Unknown Student'}
                      </span>
                      <span
                        className={`${styles.submissionBadge} ${styles[submission.status]}`}
                      >
                        {getSubmissionStatus(submission)}
                      </span>
                    </div>
                    <div className={styles.submissionItemMeta}>
                      <span>{formatDate(submission.submitted_at)}</span>
                      {submission.grade !== null && (
                        <span>{submission.grade}/{assignment.points_possible}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedSubmission && (
              <div className={styles.gradePanel}>
                <div className={styles.gradePanelHeader}>
                  <h3>{selectedSubmission.student_name}</h3>
                  <button
                    className={styles.closeButton}
                    onClick={() => setSelectedSubmission(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.submissionDetails}>
                  <div className={styles.detailItem}>
                    <span>Submitted:</span>
                    <span>{formatDate(selectedSubmission.submitted_at)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span>Status:</span>
                    <span>{getSubmissionStatus(selectedSubmission)}</span>
                  </div>
                </div>

                <div className={styles.submissionContent}>
                  <h4>Student Submission:</h4>
                  <p>{selectedSubmission.content}</p>
                </div>

                <form
                  className={styles.gradeForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGradeSubmission();
                  }}
                >
                  <h4>Grade Submission</h4>

                  <div className={styles.formGroup}>
                    <label>
                      Points ({gradeData.points}/{assignment.points_possible})
                    </label>
                    <input
                      type="number"
                      value={gradeData.points}
                      onChange={(e) =>
                        setGradeData((p) => ({
                          ...p,
                          points: parseInt(e.target.value, 10),
                        }))
                      }
                      min="0"
                      max={assignment.points_possible}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Feedback</label>
                    <textarea
                      value={gradeData.feedback}
                      onChange={(e) =>
                        setGradeData((p) => ({
                          ...p,
                          feedback: e.target.value,
                        }))
                      }
                      placeholder="Provide feedback to the student..."
                      rows={4}
                    />
                  </div>

                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={isGrading}
                  >
                    Save Grade
                  </Button>
                </form>
              </div>
            )}

            {totalSubmissionPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="secondary"
                  onClick={() => setSubmissionPage((p) => Math.max(1, p - 1))}
                  disabled={submissionPage === 1}
                >
                  Previous
                </Button>
                <span className={styles.pageInfo}>
                  Page {submissionPage} of {totalSubmissionPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setSubmissionPage((p) => Math.min(totalSubmissionPages, p + 1))
                  }
                  disabled={submissionPage === totalSubmissionPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
