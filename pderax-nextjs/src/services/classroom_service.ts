/**
 * Classroom Service
 * Matches backend: /api/v1/classrooms/* endpoints
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
  settings?: ClassroomSettings;
}

export interface CreateClassroomRequest {
  name: string;
  description: string;
  subject: string;
  grade_level: string;
}

export interface PaginatedClassrooms {
  items: Classroom[];
  total: number;
  page: number;
  per_page: number;
}

export interface StudentInClassroom {
  id: string;
  user_id: string;
  classroom_id: string;
  name: string;
  email: string;
  joined_at: string;
  status: string;
  role: string;
}

export interface PaginatedStudents {
  items: StudentInClassroom[];
  total: number;
  page: number;
  per_page: number;
}

export interface ClassroomSettings {
  allow_student_uploads: boolean;
  allow_peer_review: boolean;
  anonymous_feedback: boolean;
  email_notifications: boolean;
  auto_grading_enabled: boolean;
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

class ClassroomService {
  async createClassroom(data: CreateClassroomRequest): Promise<Classroom> {
    return apiClient.post<Classroom>('/api/v1/classrooms', data);
  }

  async listClassrooms(page = 1, limit = 10): Promise<PaginatedClassrooms> {
    return apiClient.get<PaginatedClassrooms>('/api/v1/classrooms', {
      params: { page, limit },
    });
  }

  async getClassroom(id: string): Promise<Classroom> {
    return apiClient.get<Classroom>(`/api/v1/classrooms/${id}`);
  }

  async deleteClassroom(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/classrooms/${id}`);
  }

  async joinClassroomWithCode(inviteCode: string): Promise<Classroom> {
    return apiClient.post<Classroom>('/api/v1/classrooms/join', {
      invite_code: inviteCode,
    });
  }

  async getStudents(classroomId: string, page = 1, limit = 50): Promise<PaginatedStudents> {
    return apiClient.get<PaginatedStudents>(
      `/api/v1/classrooms/${classroomId}/students`,
      { params: { page, limit } }
    );
  }

  async inviteStudent(classroomId: string, email: string): Promise<{ message: string }> {
    return apiClient.post(`/api/v1/classrooms/${classroomId}/invite`, { email });
  }

  async removeStudent(classroomId: string, studentId: string): Promise<void> {
    await apiClient.delete(`/api/v1/classrooms/${classroomId}/students/${studentId}`);
  }

  async getClassroomStudents(classroomId: string, page = 1, limit = 50): Promise<PaginatedStudents> {
    return this.getStudents(classroomId, page, limit);
  }

  async getInviteCodes(classroomId: string): Promise<ClassroomInvite[]> {
    const data = await apiClient.get(`/api/v1/classrooms/${classroomId}/invite-codes`);
    return Array.isArray(data) ? data : [];
  }

  async updateClassroomSettings(classroomId: string, settings: Partial<ClassroomSettings>): Promise<Classroom> {
    return apiClient.put<Classroom>(`/api/v1/classrooms/${classroomId}/settings`, settings);
  }
}

export default new ClassroomService();
