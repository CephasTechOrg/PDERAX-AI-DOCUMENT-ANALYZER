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
  classroom_id?: string;
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
  highest_score?: number;
  lowest_score?: number;
  score_distribution?: Record<number, number>; // range -> count
  trend_data?: TrendData[];
  strengths: string[];
  areas_for_improvement: string[];
  predicted_final_grade: string | number | null;
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
    const response = await apiClient.get<any>(
      `/api/v1/classrooms/${classroomId}/gradebook`,
      {
        params: { page, limit },
      }
    );

    const assignments = Array.isArray(response.assignments)
      ? response.assignments.map((a: any) => ({
        assignment_id: a.assignment_id ?? a.id,
        assignment_title: a.assignment_title ?? a.title,
        due_date: a.due_date,
        points_possible: a.points_possible,
        student_grades: new Map(),
        class_average: a.class_average ?? a.average_score ?? 0,
        graded_count: a.graded_count ?? 0,
      }))
      : [];

    const students = Array.isArray(response.students)
      ? response.students.map((s: any) => ({
        student_id: s.student_id,
        student_name: s.student_name,
        student_email: s.student_email,
        classroom_id: classroomId,
        grades: Array.isArray(s.grades) ? s.grades : [],
        class_average: s.class_average ?? s.overall_average ?? 0,
        letter_grade: s.letter_grade ?? s.overall_letter_grade ?? 'N/A',
        trend: s.trend ?? 0,
      }))
      : [];

    return {
      assignments,
      students,
      class_average: response.class_average ?? 0,
    };
  }

  /**
   * Get grades for a specific student
   */
  async getStudentGrades(
    classroomId: string,
    studentId: string
  ): Promise<StudentGrades> {
    const response = await apiClient.get<any>(
      `/api/v1/classrooms/${classroomId}/students/${studentId}/grades`
    );
    return {
      student_id: response.student_id,
      student_name: response.student_name,
      student_email: response.student_email,
      classroom_id: classroomId,
      grades: Array.isArray(response.grades) ? response.grades : [],
      class_average: response.class_average ?? response.overall_average ?? 0,
      letter_grade: response.letter_grade ?? response.overall_letter_grade ?? 'N/A',
      trend: response.trend ?? 0,
    };
  }

  /**
   * Get all grades for current student
   */
  async getMyGrades(classroomId: string): Promise<StudentGrades> {
    const response = await apiClient.get<any>(
      `/api/v1/classrooms/${classroomId}/grades/my`
    );
    return {
      student_id: response.student_id,
      student_name: response.student_name,
      student_email: response.student_email,
      classroom_id: classroomId,
      grades: Array.isArray(response.grades) ? response.grades : [],
      class_average: response.class_average ?? response.overall_average ?? 0,
      letter_grade: response.letter_grade ?? response.overall_letter_grade ?? 'N/A',
      trend: response.trend ?? 0,
    };
  }

  /**
   * Get performance analytics for a student
   */
  async getStudentPerformance(
    classroomId: string,
    studentId: string
  ): Promise<PerformanceAnalytics> {
    const response = await apiClient.get<PerformanceAnalytics>(
      `/api/v1/classrooms/${classroomId}/students/${studentId}/performance`
    );
    return response;
  }

  /**
   * Get performance analytics for current student
   */
  async getMyPerformance(classroomId: string): Promise<PerformanceAnalytics> {
    const response = await apiClient.get<PerformanceAnalytics>(
      `/api/v1/classrooms/${classroomId}/performance/my`
    );
    return response;
  }

  /**
   * Get class-wide performance analytics
   */
  async getClassPerformance(classroomId: string): Promise<ClassPerformance> {
    const response = await apiClient.get<ClassPerformance>(
      `/api/v1/classrooms/${classroomId}/performance`
    );
    return response;
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
      `/api/v1/classrooms/${classroomId}/students/${studentId}/report-card`,
      {
        params: { period },
      }
    );
    return response;
  }

  /**
   * Get current student's report card
   */
  async getMyReportCard(
    classroomId: string,
    period?: string
  ): Promise<ReportCard> {
    const response = await apiClient.get<ReportCard>(
      `/api/v1/classrooms/${classroomId}/report-card/my`,
      {
        params: { period },
      }
    );
    return response;
  }

  /**
   * Add grade weightings (percentages)
   */
  async setGradeWeightings(
    classroomId: string,
    weightings: GradeWeighting[]
  ): Promise<void> {
    await apiClient.post(`/api/v1/classrooms/${classroomId}/grade-weightings`, {
      weightings,
    });
  }

  /**
   * Get grade weightings for classroom
   */
  async getGradeWeightings(classroomId: string): Promise<GradeWeighting[]> {
    const response = await apiClient.get<any>(
      `/api/v1/classrooms/${classroomId}/grade-weightings`
    );
    return Array.isArray(response)
      ? response
      : [response].filter(Boolean);
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
      `/api/v1/classrooms/${classroomId}/assignments/${assignmentId}/grades`,
      {
        params: { page, limit },
      }
    );
    return response;
  }

  /**
   * Bulk update grades (for multiple students)
   */
  async bulkUpdateGrades(
    classroomId: string,
    assignmentId: string,
    grades: Array<{ submission_id: string; points_earned: number; feedback?: string }>
  ): Promise<void> {
    await apiClient.post(
      `/api/v1/classrooms/${classroomId}/assignments/${assignmentId}/grades/bulk`,
      { grades }
    );
  }

  /**
   * Export gradebook as CSV
   */
  async exportGradebook(classroomId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/api/v1/classrooms/${classroomId}/gradebook/export`,
      {
        responseType: 'blob',
      }
    );
    return response;
  }

  /**
   * Export report card as PDF
   */
  async exportReportCard(
    classroomId: string,
    studentId: string
  ): Promise<Blob> {
    const response = await apiClient.get<ReportCard>(
      `/api/v1/classrooms/${classroomId}/students/${studentId}/report-card`
    );
    return new Blob([JSON.stringify(response, null, 2)], {
      type: 'application/json',
    });
  }

  /**
   * Get students by performance level
   */
  async getStudentsByPerformance(
    classroomId: string,
    level: 'top' | 'average' | 'struggling',
    limit: number = 10
  ): Promise<StudentGrades[]> {
    const gradebook = await this.getGradebook(classroomId, 1, 200);
    const sorted = [...gradebook.students].sort((a, b) => b.class_average - a.class_average);

    if (level === 'top') {
      return sorted.slice(0, limit);
    }

    if (level === 'struggling') {
      return sorted.slice().reverse().slice(0, limit);
    }

    const midpoint = Math.max(0, Math.floor(sorted.length / 2) - Math.floor(limit / 2));
    return sorted.slice(midpoint, midpoint + limit);
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
      `/api/v1/classrooms/${classroomId}/grade-statistics`
    );
    return response;
  }

  /**
   * Generate progress reports for all students
   */
  async generateProgressReports(classroomId: string): Promise<ReportCard[]> {
    const response = await apiClient.get<ReportCard[]>(
      `/api/v1/classrooms/${classroomId}/progress-reports`
    );
    return response;
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
      `/api/v1/classrooms/${classroomId}/grades/trends`,
      {
        params: { days },
      }
    );
    return response;
  }
}

export default new GradeService();
