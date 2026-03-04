/**
 * Analytics Service
 * Matches backend: /api/analytics/* endpoints
 */

import apiClient from './api';

export interface UserStats {
  total_documents: number;
  total_flashcard_sets: number;
  total_quizzes: number;
  total_study_time: number; // minutes
  average_quiz_score: number; // 0-100
  current_streak: number;
  documents_this_week: number;
  quiz_attempts_this_week: number;
}

export interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface QuizPerformancePoint {
  date: string;
  score: number;
  attempts: number;
}

export interface StudyTimePoint {
  date: string;
  minutes: number;
  hours: number;
}

export interface SubjectBreakdownItem {
  subject: string;
  count: number;
}

export interface AnalyticsDashboard {
  stats: UserStats;
  activity_feed: { items: ActivityItem[] };
  quiz_performance: { items: QuizPerformancePoint[] };
  study_time: { items: StudyTimePoint[] };
  subject_breakdown: { items: SubjectBreakdownItem[] };
}

class AnalyticsService {
  /** Get full dashboard in one request */
  async getDashboard(): Promise<AnalyticsDashboard> {
    return apiClient.get<AnalyticsDashboard>('/api/analytics/dashboard');
  }

  /** Get overview stats only */
  async getOverview(): Promise<UserStats> {
    return apiClient.get<UserStats>('/api/analytics/overview');
  }

  /** Get recent activity */
  async getActivity(limit = 20): Promise<{ items: ActivityItem[] }> {
    return apiClient.get(`/api/analytics/activity?limit=${limit}`);
  }
}

export default new AnalyticsService();
