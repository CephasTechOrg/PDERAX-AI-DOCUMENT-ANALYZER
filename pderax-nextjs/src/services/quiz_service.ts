/**
 * Quiz Service
 * Handles quiz generation and history retrieval
 */

import apiClient from './api';
import { QuizGenerateResponse, QuizHistoryItem } from '@/types';

class QuizService {
  /**
   * Generate quiz from text.
   * Backend: POST /api/v1/quiz/generate
   */
  async generate(
    text: string,
    count: number = 10,
    difficulty: string = 'medium',
    analysisId?: string,
  ): Promise<QuizGenerateResponse> {
    const payload: Record<string, unknown> = { text, count, difficulty };
    if (analysisId) payload.analysis_id = analysisId;

    return apiClient.post<QuizGenerateResponse>('/api/v1/quiz/generate', payload);
  }

  /**
   * Quick generate quiz.
   * Backend: POST /api/v1/quiz/generate-quick
   */
  async generateQuick(
    text: string,
    count: number = 10,
    difficulty: string = 'medium',
    analysisId?: string,
  ): Promise<QuizGenerateResponse> {
    const payload: Record<string, unknown> = { text, count, difficulty };
    if (analysisId) payload.analysis_id = analysisId;

    return apiClient.post<QuizGenerateResponse>('/api/v1/quiz/generate-quick', payload);
  }

  /**
   * List all quiz sets for the current user.
   */
  async getSets(): Promise<QuizHistoryItem[]> {
    const response = await apiClient.get<QuizHistoryItem[]>('/api/v1/history/quiz-sets');
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get a single quiz set by ID.
   */
  async getSet(id: string): Promise<QuizHistoryItem> {
    return apiClient.get<QuizHistoryItem>(`/api/v1/history/quiz-sets/${id}`);
  }

  /**
   * Delete a quiz set.
   */
  async deleteSet(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/history/quiz-sets/${id}`);
  }
}

export default new QuizService();
