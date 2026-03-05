/**
 * Attendance Service
 * Matches backend: /api/v1/classrooms/{id}/sessions endpoints
 */

import apiClient from './api';

export interface ClassSession {
  id: string;
  classroom_id: string;
  teacher_id: string;
  title: string;
  status: 'open' | 'closed';
  session_date: string;
  closed_at: string | null;
  student_count: number;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  classroom_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_at: string;
}

export interface AttendanceUpdate {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

class AttendanceService {
  async getSessions(classroomId: string): Promise<ClassSession[]> {
    const data = await apiClient.get(`/api/v1/classrooms/${classroomId}/sessions`);
    return Array.isArray(data) ? data : [];
  }

  async createSession(classroomId: string, title: string): Promise<ClassSession> {
    return apiClient.post(`/api/v1/classrooms/${classroomId}/sessions`, { title });
  }

  async closeSession(classroomId: string, sessionId: string): Promise<ClassSession> {
    return apiClient.patch(`/api/v1/classrooms/${classroomId}/sessions/${sessionId}`, { status: 'closed' });
  }

  async getAttendance(classroomId: string, sessionId: string): Promise<AttendanceRecord[]> {
    const data = await apiClient.get(`/api/v1/classrooms/${classroomId}/sessions/${sessionId}/attendance`);
    return Array.isArray(data) ? data : [];
  }

  async updateAttendance(
    classroomId: string,
    sessionId: string,
    records: AttendanceUpdate[]
  ): Promise<AttendanceRecord[]> {
    const data = await apiClient.put(
      `/api/v1/classrooms/${classroomId}/sessions/${sessionId}/attendance`,
      { records }
    );
    return Array.isArray(data) ? data : [];
  }
}

export default new AttendanceService();
