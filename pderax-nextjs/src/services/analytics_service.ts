/**
 * Analytics Service
 * Tracks and retrieves study progress and learning analytics
 */

import apiClient from './api';

export interface StudyStats {
  total_sessions: number;
  total_cards_studied: number;
  average_accuracy: number;
  current_streak: number;
  total_study_time_minutes: number;
}

export interface DocumentStats {
  document_id: string;
  filename: string;
  total_cards: number;
  cards_studied: number;
  average_accuracy: number;
  last_studied: string;
  study_sessions: number;
}

export interface DailyProgress {
  date: string;
  cards_studied: number;
  accuracy: number;
  session_count: number;
  study_time_minutes: number;
}

export interface LearningTrend {
  week_number: number;
  average_accuracy: number;
  cards_studied: number;
  improvement_rate: number;
}

class AnalyticsService {
  /**
   * Get overall study statistics
   */
  async getStudyStats(): Promise<StudyStats> {
    const response = await apiClient.get<StudyStats>('/api/analytics/overview');
    if (!response.data) {
      throw new Error(response.error?.message || 'Failed to load study stats');
    }
    return response.data;
  }

  /**
   * Get statistics for a specific document
   */
  async getDocumentStats(documentId: string): Promise<DocumentStats> {
    const response = await apiClient.get<DocumentStats>(
      `/api/analytics/overview`
    );
    if (!response.data) {
      throw new Error(response.error?.message || 'Failed to load document stats');
    }
    return response.data;
  }

  /**
   * Get daily progress for a date range
   */
  async getDailyProgress(
    startDate: string,
    endDate: string
  ): Promise<DailyProgress[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    const response = await apiClient.get<DailyProgress[]>(
      `/api/analytics/study-time?${params.toString()}`
    );
    return response.data ?? [];
  }

  /**
   * Get weekly learning trends
   */
  async getWeeklyTrends(weeks: number = 4): Promise<LearningTrend[]> {
    const params = new URLSearchParams({
      weeks: weeks.toString(),
    });

    const response = await apiClient.get<LearningTrend[]>(
      `/api/analytics/study-time?${params.toString()}`
    );
    return response.data ?? [];
  }

  /**
   * Get current streak information
   */
  async getStreak(): Promise<{ current: number; best: number; last_study: string }> {
    const response = await apiClient.get<{
      current: number;
      best: number;
      last_study: string;
    }>('/api/analytics/overview');
    return response.data ?? { current: 0, best: 0, last_study: '' };
  }

  /**
   * Get most studied documents
   */
  async getMostStudied(limit: number = 5): Promise<DocumentStats[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    const response = await apiClient.get<DocumentStats[]>(
      '/api/analytics/subjects'
    );
    return response.data ?? [];
  }

  /**
   * Get learning goals progress
   */
  async getGoalsProgress(): Promise<{
    daily_goal: number;
    daily_progress: number;
    weekly_goal: number;
    weekly_progress: number;
    monthly_goal: number;
    monthly_progress: number;
  }> {
    const response = await apiClient.get<{
      daily_goal: number;
      daily_progress: number;
      weekly_goal: number;
      weekly_progress: number;
      monthly_goal: number;
      monthly_progress: number;
    }>('/api/analytics/dashboard');
    return response.data ?? {
      daily_goal: 0,
      daily_progress: 0,
      weekly_goal: 0,
      weekly_progress: 0,
      monthly_goal: 0,
      monthly_progress: 0,
    };
  }

  /**
   * Get difficulty distribution of studied cards
   */
  async getDifficultyDistribution(): Promise<{
    easy: number;
    medium: number;
    hard: number;
  }> {
    const response = await apiClient.get<{
      easy: number;
      medium: number;
      hard: number;
    }>('/api/analytics/subjects');
    return response.data ?? { easy: 0, medium: 0, hard: 0 };
  }
}

export default new AnalyticsService();
