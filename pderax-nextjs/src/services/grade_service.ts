/**
 * Grade Service
 * Manage gradebooks, grades, and performance tracking
 */

import apiClient from './api';

export interface GradeEntry {
  id: string;
  student_id: string;
  student_name: string;
  assignment_id: string;
  classroom_id: string;
  grade: number;
  points_possible: number;
  percentage: number;
  graded_at: string;
  feedback: string;
  status: 'graded' | 'pending' | 'returned';
}

export interface StudentGrades {
  student_id: string;
  student_name: string;
  student_email: string;
  classroom_id: string;
  grades: GradeEntry[];
  class_average: number;
  letter_grade: string;
  trend: number; // percentage change from previous period
}

export interface GradebookEntry {
  assignment_id: string;
  assignment_title: string;
  due_date: string;
  points_possible: number;
  student_grades: Map<string, GradeEntry>;
  class_average: number;
  graded_count: number;
}

export interface PerformanceAnalytics {
  student_id: string;
  overall_average: number;
  highest_score: number;
  lowest_score: number;
  score_distribution: Record<number, number>; // range -> count
  trend_data: TrendData[];
  strengths: string[];
  areas_for_improvement: string[];
  predicted_final_grade: string;
}

export interface TrendData {
  assignment_number: number;
  score: number;
  date: string;
  trend_percentage: number;
}

export interface ClassPerformance {
  classroom_id: string;
  class_name: string;
  total_students: number;
  class_average: number;
  highest_score: number;
  lowest_score: number;
  score_distribution: Record<string, number>;
  top_performers: StudentGrades[];
  struggling_students: StudentGrades[];
  improvement_needed: string[];
}

export interface ReportCard {
  student_id: string;
  student_name: string;
  classroom_id: string;
  classroom_name: string;
  period: string;
  overall_grade: string;
  gpa: number;
  grades_by_assignment: GradeEntry[];
  teacher_comments: string;
  generated_at: string;
}

export interface CreateGradeRequest {
  assignment_id: string;
  student_id: string;
  grade: number;
  feedback: string;
}

export interface UpdateGradeRequest {
  grade?: number;
  feedback?: string;
}

export interface GradeWeighting {
  assignment_id: string;
  weight: number; // percentage
}

export interface PaginatedGrades {
  items: GradeEntry[];
  total: number;
  page: number;
  per_page: number;
}

class GradeService {
  /**
   * Get gradebook for a classroom
   */
  async getGradebook(
    classroomId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    assignments: GradebookEntry[];
    students: StudentGrades[];
    class_average: number;
  }> {
    const response = await apiClient.get(
      `/api/classrooms/${classroomId}/gradebook`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Get grades for a specific student
   */
  async getStudentGrades(
    classroomId: string,
    studentId: string
  ): Promise<StudentGrades> {
    const response = await apiClient.get<StudentGrades>(
      `/api/classrooms/${classroomId}/students/${studentId}/grades`
    );
    return response.data;
  }

  /**
   * Get all grades for current student
   */
  async getMyGrades(classroomId: string): Promise<StudentGrades> {
    const response = await apiClient.get<StudentGrades>(
      `/api/classrooms/${classroomId}/my-grades`
    );
    return response.data;
  }

  /**
   * Get performance analytics for a student
   */
  async getStudentPerformance(
    classroomId: string,
    studentId: string
  ): Promise<PerformanceAnalytics> {
    const response = await apiClient.get<PerformanceAnalytics>(
      `/api/classrooms/${classroomId}/students/${studentId}/performance`
    );
    return response.data;
  }

  /**
   * Get performance analytics for current student
   */
  async getMyPerformance(classroomId: string): Promise<PerformanceAnalytics> {
    const response = await apiClient.get<PerformanceAnalytics>(
      `/api/classrooms/${classroomId}/my-performance`
    );
    return response.data;
  }

  /**
   * Get class-wide performance analytics
   */
  async getClassPerformance(classroomId: string): Promise<ClassPerformance> {
    const response = await apiClient.get<ClassPerformance>(
      `/api/classrooms/${classroomId}/performance`
    );
    return response.data;
  }

  /**
   * Generate report card for student
   */
  async generateReportCard(
    classroomId: string,
    studentId: string,
    period?: string
  ): Promise<ReportCard> {
    const response = await apiClient.get<ReportCard>(
      `/api/classrooms/${classroomId}/students/${studentId}/report-card`,
      {
        params: { period },
      }
    );
    return response.data;
  }

  /**
   * Get current student's report card
   */
  async getMyReportCard(
    classroomId: string,
    period?: string
  ): Promise<ReportCard> {
    const response = await apiClient.get<ReportCard>(
      `/api/classrooms/${classroomId}/my-report-card`,
      {
        params: { period },
      }
    );
    return response.data;
  }

  /**
   * Add grade weightings (percentages)
   */
  async setGradeWeightings(
    classroomId: string,
    weightings: GradeWeighting[]
  ): Promise<void> {
    await apiClient.post(`/api/classrooms/${classroomId}/grade-weightings`, {
      weightings,
    });
  }

  /**
   * Get grade weightings for classroom
   */
  async getGradeWeightings(classroomId: string): Promise<GradeWeighting[]> {
    const response = await apiClient.get<GradeWeighting[]>(
      `/api/classrooms/${classroomId}/grade-weightings`
    );
    return response.data;
  }

  /**
   * Get grades for specific assignment
   */
  async getAssignmentGrades(
    classroomId: string,
    assignmentId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedGrades> {
    const response = await apiClient.get<PaginatedGrades>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/grades`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Bulk update grades (for multiple students)
   */
  async bulkUpdateGrades(
    classroomId: string,
    assignmentId: string,
    grades: Array<{ student_id: string; grade: number; feedback?: string }>
  ): Promise<void> {
    await apiClient.post(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/bulk-grade`,
      { grades }
    );
  }

  /**
   * Export gradebook as CSV
   */
  async exportGradebook(classroomId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/api/classrooms/${classroomId}/gradebook/export`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Export report card as PDF
   */
  async exportReportCard(
    classroomId: string,
    studentId: string
  ): Promise<Blob> {
    const response = await apiClient.get(
      `/api/classrooms/${classroomId}/students/${studentId}/report-card/export`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Get students by performance level
   */
  async getStudentsByPerformance(
    classroomId: string,
    level: 'top' | 'average' | 'struggling',
    limit: number = 10
  ): Promise<StudentGrades[]> {
    const response = await apiClient.get<StudentGrades[]>(
      `/api/classrooms/${classroomId}/students/by-performance`,
      {
        params: { level, limit },
      }
    );
    return response.data;
  }

  /**
   * Get grade statistics for classroom
   */
  async getGradeStatistics(classroomId: string): Promise<{
    mean: number;
    median: number;
    mode: number;
    std_dev: number;
    min: number;
    max: number;
  }> {
    const response = await apiClient.get(
      `/api/classrooms/${classroomId}/grade-statistics`
    );
    return response.data;
  }

  /**
   * Generate progress reports for all students
   */
  async generateProgressReports(classroomId: string): Promise<ReportCard[]> {
    const response = await apiClient.get<ReportCard[]>(
      `/api/classrooms/${classroomId}/progress-reports`
    );
    return response.data;
  }

  /**
   * Get trending grades over time
   */
  async getGradeTrends(classroomId: string, days: number = 30): Promise<{
    dates: string[];
    class_average: number[];
    student_id: string;
    student_grades: number[];
  }> {
    const response = await apiClient.get(
      `/api/classrooms/${classroomId}/grade-trends`,
      {
        params: { days },
      }
    );
    return response.data;
  }
}

export default new GradeService();
