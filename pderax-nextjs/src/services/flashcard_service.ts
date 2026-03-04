/**
 * Flashcard Service
 * Handles flashcard generation and history retrieval
 */

import apiClient from './api';
import { FlashcardSet, FlashcardGenerateResponse, CardDifficulty } from '@/types';

class FlashcardService {
  /**
   * Generate flashcards from text.
   * Backend: POST /api/v1/flashcards/generate
   */
  async generate(
    text: string,
    count: number = 10,
    difficulty: CardDifficulty = 'medium',
    focusTopics?: string[],
    analysisId?: string,
  ): Promise<FlashcardGenerateResponse> {
    const payload: Record<string, unknown> = { text, count, difficulty };
    if (focusTopics?.length) payload.focus_topics = focusTopics;
    if (analysisId) payload.analysis_id = analysisId;

    return apiClient.post<FlashcardGenerateResponse>(
      '/api/v1/flashcards/generate',
      payload,
    );
  }

  /**
   * Quick generate flashcards.
   * Backend: POST /api/v1/flashcards/generate-quick
   */
  async generateQuick(
    text: string,
    count: number = 10,
    difficulty: CardDifficulty = 'medium',
    analysisId?: string,
  ): Promise<FlashcardGenerateResponse> {
    const payload: Record<string, unknown> = { text, count, difficulty };
    if (analysisId) payload.analysis_id = analysisId;

    return apiClient.post<FlashcardGenerateResponse>(
      '/api/v1/flashcards/generate-quick',
      payload,
    );
  }

  /**
   * List all flashcard sets for the current user.
   * Backend returns a flat array.
   */
  async getSets(): Promise<FlashcardSet[]> {
    const response = await apiClient.get<FlashcardSet[]>('/api/v1/history/flashcard-sets');
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get a single flashcard set by ID.
   */
  async getSet(id: string): Promise<FlashcardSet> {
    return apiClient.get<FlashcardSet>(`/api/v1/history/flashcard-sets/${id}`);
  }

  /**
   * Delete a flashcard set.
   */
  async deleteSet(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/history/flashcard-sets/${id}`);
  }
}

export default new FlashcardService();
