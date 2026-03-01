/**
 * Flashcard Management Service
 * Handles flashcard generation, retrieval, and study progress
 */

import apiClient from './api';
import { Flashcard, PaginatedResponse, StudyProgress } from '@/types';

class FlashcardService {
  /**
   * Generate flashcards from a document
   * This triggers AI processing on the backend
   */
  async generateFlashcards(
    documentId: string,
    count?: number
  ): Promise<Flashcard[]> {
    const payload: Record<string, unknown> = {};
    if (count) {
      payload.count = count;
    }

    const response = await apiClient.post<Flashcard[]>(
      `/documents/${documentId}/flashcards/generate`,
      payload
    );
    return response;
  }

  /**
   * Get all flashcards for a document
   */
  async getFlashcards(
    documentId: string,
    page: number = 1,
    page_size: number = 20
  ): Promise<PaginatedResponse<Flashcard>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
    });

    const response = await apiClient.get<PaginatedResponse<Flashcard>>(
      `/documents/${documentId}/flashcards?${params.toString()}`
    );
    return response;
  }

  /**
   * Get single flashcard
   */
  async getFlashcard(flashcardId: string): Promise<Flashcard> {
    const response = await apiClient.get<Flashcard>(
      `/flashcards/${flashcardId}`
    );
    return response;
  }

  /**
   * Delete a flashcard
   */
  async deleteFlashcard(flashcardId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/flashcards/${flashcardId}`
    );
    return response;
  }

  /**
   * Update flashcard (edit question/answer)
   */
  async updateFlashcard(
    flashcardId: string,
    data: Partial<Flashcard>
  ): Promise<Flashcard> {
    const response = await apiClient.put<Flashcard>(
      `/flashcards/${flashcardId}`,
      data
    );
    return response;
  }

  /**
   * Record study progress for a flashcard
   * Called after user studies/reviews the card
   */
  async recordProgress(
    flashcardId: string,
    correct: boolean
  ): Promise<StudyProgress> {
    const response = await apiClient.post<StudyProgress>(
      `/flashcards/${flashcardId}/progress`,
      { correct }
    );
    return response;
  }

  /**
   * Get study progress for a flashcard
   */
  async getProgress(flashcardId: string): Promise<StudyProgress> {
    const response = await apiClient.get<StudyProgress>(
      `/flashcards/${flashcardId}/progress`
    );
    return response;
  }

  /**
   * Get all study progress for a document
   */
  async getDocumentProgress(documentId: string): Promise<StudyProgress[]> {
    const response = await apiClient.get<StudyProgress[]>(
      `/documents/${documentId}/progress`
    );
    return response;
  }

  /**
   * Reset progress for flashcard (start over)
   */
  async resetProgress(flashcardId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      `/flashcards/${flashcardId}/progress/reset`,
      {}
    );
    return response;
  }
}

export default new FlashcardService();
