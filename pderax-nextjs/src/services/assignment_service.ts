/**
 * Assignment Service
 * Manage assignments, submissions, and grading
 */

import apiClient from './api';

export type AssignmentStatus = 'draft' | 'published' | 'closed' | 'archived';
export type SubmissionStatus =
  | 'not_submitted'
  | 'submitted'
  | 'graded'
  | 'returned';

export interface Assignment {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  document_id?: string;
  due_date: string;
  points_possible: number;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  submission_count: number;
  graded_count: number;
  settings: AssignmentSettings;
}

export interface AssignmentSettings {
  allow_late_submission: boolean;
  late_penalty_percent: number;
  allow_resubmission: boolean;
  anonymous_grading: boolean;
  rubric_enabled: boolean;
  peer_review_enabled: boolean;
}

export interface CreateAssignmentRequest {
  title: string;
  description: string;
  document_id?: string;
  due_date: string;
  points_possible: number;
  settings?: Partial<AssignmentSettings>;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  due_date?: string;
  points_possible?: number;
  settings?: Partial<AssignmentSettings>;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  content: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  graded_at?: string;
  graded_by?: string;
  status: SubmissionStatus;
  attachments?: string[];
  revision_count: number;
}

export interface GradeRequest {
  grade: number;
  feedback: string;
  rubric_scores?: Record<string, number>;
  return_for_revision: boolean;
}

export interface RubricItem {
  id: string;
  description: string;
  points: number;
  criteria: string;
}

export interface AssignmentRubric {
  id: string;
  assignment_id: string;
  items: RubricItem[];
}

export interface PaginatedAssignments {
  items: Assignment[];
  total: number;
  page: number;
  per_page: number;
}

export interface PaginatedSubmissions {
  items: Submission[];
  total: number;
  page: number;
  per_page: number;
}

export interface AssignmentStats {
  total_submissions: number;
  submitted_count: number;
  graded_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  submission_rate: number;
}

class AssignmentService {
  /**
   * Create a new assignment
   */
  async createAssignment(
    classroomId: string,
    data: CreateAssignmentRequest
  ): Promise<Assignment> {
    const response = await apiClient.post<Assignment>(
      `/api/classrooms/${classroomId}/assignments`,
      data
    );
    return response.data;
  }

  /**
   * Get assignments for a classroom
   */
  async listAssignments(
    classroomId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedAssignments> {
    const response = await apiClient.get<PaginatedAssignments>(
      `/api/classrooms/${classroomId}/assignments`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Get a specific assignment
   */
  async getAssignment(
    classroomId: string,
    assignmentId: string
  ): Promise<Assignment> {
    const response = await apiClient.get<Assignment>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}`
    );
    return response.data;
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    classroomId: string,
    assignmentId: string,
    data: UpdateAssignmentRequest
  ): Promise<Assignment> {
    const response = await apiClient.put<Assignment>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(
    classroomId: string,
    assignmentId: string
  ): Promise<void> {
    await apiClient.delete(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}`
    );
  }

  /**
   * Publish assignment
   */
  async publishAssignment(
    classroomId: string,
    assignmentId: string
  ): Promise<Assignment> {
    const response = await apiClient.post<Assignment>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/publish`,
      {}
    );
    return response.data;
  }

  /**
   * Close assignment (no more submissions allowed)
   */
  async closeAssignment(
    classroomId: string,
    assignmentId: string
  ): Promise<Assignment> {
    const response = await apiClient.post<Assignment>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/close`,
      {}
    );
    return response.data;
  }

  /**
   * Get submissions for an assignment
   */
  async getSubmissions(
    classroomId: string,
    assignmentId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedSubmissions> {
    const response = await apiClient.get<PaginatedSubmissions>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/submissions`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Get a specific submission
   */
  async getSubmission(
    classroomId: string,
    assignmentId: string,
    submissionId: string
  ): Promise<Submission> {
    const response = await apiClient.get<Submission>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/submissions/${submissionId}`
    );
    return response.data;
  }

  /**
   * Submit assignment as student
   */
  async submitAssignment(
    classroomId: string,
    assignmentId: string,
    content: string,
    attachments?: File[]
  ): Promise<Submission> {
    const formData = new FormData();
    formData.append('content', content);

    if (attachments) {
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await apiClient.post<Submission>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/submit`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Grade a submission
   */
  async gradeSubmission(
    classroomId: string,
    assignmentId: string,
    submissionId: string,
    gradeData: GradeRequest
  ): Promise<Submission> {
    const response = await apiClient.put<Submission>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      gradeData
    );
    return response.data;
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(
    classroomId: string,
    assignmentId: string
  ): Promise<AssignmentStats> {
    const response = await apiClient.get<AssignmentStats>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/stats`
    );
    return response.data;
  }

  /**
   * Create or update rubric for assignment
   */
  async setRubric(
    classroomId: string,
    assignmentId: string,
    rubricItems: RubricItem[]
  ): Promise<AssignmentRubric> {
    const response = await apiClient.post<AssignmentRubric>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/rubric`,
      { items: rubricItems }
    );
    return response.data;
  }

  /**
   * Get rubric for assignment
   */
  async getRubric(
    classroomId: string,
    assignmentId: string
  ): Promise<AssignmentRubric | null> {
    const response = await apiClient.get<AssignmentRubric>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/rubric`
    );
    return response.data;
  }

  /**
   * Export submissions as CSV or ZIP
   */
  async exportSubmissions(
    classroomId: string,
    assignmentId: string,
    format: 'csv' | 'zip' = 'zip'
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/submissions/export`,
      {
        params: { format },
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Get submission for current student
   */
  async getMySubmission(
    classroomId: string,
    assignmentId: string
  ): Promise<Submission> {
    const response = await apiClient.get<Submission>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/my-submission`
    );
    return response.data;
  }

  /**
   * Get student's assignments for classroom
   */
  async getStudentAssignments(
    classroomId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedAssignments> {
    const response = await apiClient.get<PaginatedAssignments>(
      `/api/classrooms/${classroomId}/my-assignments`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  }
}

export default new AssignmentService();
