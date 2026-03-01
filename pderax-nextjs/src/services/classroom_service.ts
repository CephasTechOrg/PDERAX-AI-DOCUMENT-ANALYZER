/**
 * Classroom Service
 * Manage classrooms, students, invitations, and settings
 */

import apiClient from './api';

export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  description: string;
  subject: string;
  grade_level: string;
  invite_code: string;
  student_count: number;
  created_at: string;
  updated_at: string;
  settings: ClassroomSettings;
}

export interface ClassroomSettings {
  allow_student_uploads: boolean;
  allow_peer_review: boolean;
  anonymous_feedback: boolean;
  email_notifications: boolean;
  auto_grading_enabled: boolean;
}

export interface CreateClassroomRequest {
  name: string;
  description: string;
  subject: string;
  grade_level: string;
}

export interface UpdateClassroomRequest {
  name?: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  settings?: Partial<ClassroomSettings>;
}

export interface ClassroomInvite {
  id: string;
  classroom_id: string;
  invite_code: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  created_at: string;
}

export interface StudentInClassroom {
  id: string;
  user_id: string;
  classroom_id: string;
  name: string;
  email: string;
  joined_at: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'student' | 'assistant';
}

export interface PaginatedClassrooms {
  items: Classroom[];
  total: number;
  page: number;
  per_page: number;
}

export interface PaginatedStudents {
  items: StudentInClassroom[];
  total: number;
  page: number;
  per_page: number;
}

class ClassroomService {
  /**
   * Create a new classroom
   */
  async createClassroom(data: CreateClassroomRequest): Promise<Classroom> {
    const response = await apiClient.post<Classroom>('/api/classrooms', data);
    return response.data;
  }

  /**
   * Get all classrooms for current user
   */
  async listClassrooms(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedClassrooms> {
    const response = await apiClient.get<PaginatedClassrooms>(
      '/api/classrooms',
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Get a specific classroom by ID
   */
  async getClassroom(classroomId: string): Promise<Classroom> {
    const response = await apiClient.get<Classroom>(
      `/api/classrooms/${classroomId}`
    );
    return response.data;
  }

  /**
   * Update classroom details
   */
  async updateClassroom(
    classroomId: string,
    data: UpdateClassroomRequest
  ): Promise<Classroom> {
    const response = await apiClient.put<Classroom>(
      `/api/classrooms/${classroomId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a classroom
   */
  async deleteClassroom(classroomId: string): Promise<void> {
    await apiClient.delete(`/api/classrooms/${classroomId}`);
  }

  /**
   * Get classroom statistics
   */
  async getClassroomStats(
    classroomId: string
  ): Promise<{
    total_students: number;
    total_assignments: number;
    average_score: number;
    active_assignments: number;
  }> {
    const response = await apiClient.get(
      `/api/classrooms/${classroomId}/stats`
    );
    return response.data;
  }

  /**
   * Get list of students in classroom
   */
  async getClassroomStudents(
    classroomId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedStudents> {
    const response = await apiClient.get<PaginatedStudents>(
      `/api/classrooms/${classroomId}/students`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Invite a student by email
   */
  async inviteStudent(
    classroomId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(
      `/api/classrooms/${classroomId}/invite`,
      { email }
    );
    return response.data;
  }

  /**
   * Generate new invite code
   */
  async generateInviteCode(classroomId: string): Promise<ClassroomInvite> {
    const response = await apiClient.post<ClassroomInvite>(
      `/api/classrooms/${classroomId}/invite-code`,
      {}
    );
    return response.data;
  }

  /**
   * Get invite codes for classroom
   */
  async getInviteCodes(classroomId: string): Promise<ClassroomInvite[]> {
    const response = await apiClient.get<ClassroomInvite[]>(
      `/api/classrooms/${classroomId}/invite-codes`
    );
    return response.data;
  }

  /**
   * Remove student from classroom
   */
  async removeStudent(
    classroomId: string,
    studentId: string
  ): Promise<void> {
    await apiClient.delete(
      `/api/classrooms/${classroomId}/students/${studentId}`
    );
  }

  /**
   * Change student role (student or assistant)
   */
  async changeStudentRole(
    classroomId: string,
    studentId: string,
    role: 'student' | 'assistant'
  ): Promise<StudentInClassroom> {
    const response = await apiClient.put<StudentInClassroom>(
      `/api/classrooms/${classroomId}/students/${studentId}`,
      { role }
    );
    return response.data;
  }

  /**
   * Update classroom settings
   */
  async updateClassroomSettings(
    classroomId: string,
    settings: Partial<ClassroomSettings>
  ): Promise<Classroom> {
    const response = await apiClient.put<Classroom>(
      `/api/classrooms/${classroomId}/settings`,
      settings
    );
    return response.data;
  }

  /**
   * Archive classroom
   */
  async archiveClassroom(classroomId: string): Promise<Classroom> {
    const response = await apiClient.post<Classroom>(
      `/api/classrooms/${classroomId}/archive`,
      {}
    );
    return response.data;
  }

  /**
   * Join classroom with invite code
   */
  async joinClassroomWithCode(inviteCode: string): Promise<Classroom> {
    const response = await apiClient.post<Classroom>(
      '/api/classrooms/join',
      { invite_code: inviteCode }
    );
    return response.data;
  }

  /**
   * Get classrooms where user is a student
   */
  async getStudentClassrooms(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedClassrooms> {
    const response = await apiClient.get<PaginatedClassrooms>(
      '/api/classrooms/student/enrolled',
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Export classroom roster as CSV
   */
  async exportClassroomRoster(classroomId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/api/classrooms/${classroomId}/roster/export`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export default new ClassroomService();
