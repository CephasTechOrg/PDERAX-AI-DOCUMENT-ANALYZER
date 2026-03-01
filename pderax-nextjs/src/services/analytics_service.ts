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
    const response = await apiClient.get<StudyStats>('/user/stats');
    return response;
  }

  /**
   * Get statistics for a specific document
   */
  async getDocumentStats(documentId: string): Promise<DocumentStats> {
    const response = await apiClient.get<DocumentStats>(
      `/documents/${documentId}/stats`
    );
    return response;
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
      `/user/progress/daily?${params.toString()}`
    );
    return response;
  }

  /**
   * Get weekly learning trends
   */
  async getWeeklyTrends(weeks: number = 4): Promise<LearningTrend[]> {
    const params = new URLSearchParams({
      weeks: weeks.toString(),
    });

    const response = await apiClient.get<LearningTrend[]>(
      `/user/progress/trends?${params.toString()}`
    );
    return response;
  }

  /**
   * Get current streak information
   */
  async getStreak(): Promise<{ current: number; best: number; last_study: string }> {
    const response = await apiClient.get<{
      current: number;
      best: number;
      last_study: string;
    }>('/user/streak');
    return response;
  }

  /**
   * Get most studied documents
   */
  async getMostStudied(limit: number = 5): Promise<DocumentStats[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    const response = await apiClient.get<DocumentStats[]>(
      `/user/documents/most-studied?${params.toString()}`
    );
    return response;
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
    }>('/user/goals');
    return response;
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
    }>('/user/difficulty-distribution');
    return response;
  }
}

export default new AnalyticsService();
