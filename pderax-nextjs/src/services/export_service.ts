/**
 * Export Service
 * Handles document and flashcard export functionality
 */

import apiClient from './api';

export type ExportFormat = 'pdf' | 'csv' | 'json';

export interface ExportRequest {
  format: ExportFormat;
  includeAnswers?: boolean;
  includeProgress?: boolean;
}

export interface ExportResponse {
  download_url: string;
  filename: string;
  file_size: number;
  created_at: string;
}

class ExportService {
  /**
   * Export flashcards to specified format
   */
  async exportFlashcards(
    documentId: string,
    request: ExportRequest
  ): Promise<ExportResponse> {
    const response = await apiClient.post<ExportResponse>(
      `/documents/${documentId}/flashcards/export`,
      request
    );
    return response;
  }

  /**
   * Export document with all metadata
   */
  async exportDocument(
    documentId: string,
    format: ExportFormat
  ): Promise<ExportResponse> {
    const response = await apiClient.post<ExportResponse>(
      `/documents/${documentId}/export`,
      { format }
    );
    return response;
  }

  /**
   * Export study progress report
   */
  async exportProgressReport(
    format: ExportFormat = 'pdf'
  ): Promise<ExportResponse> {
    const response = await apiClient.post<ExportResponse>(
      '/user/progress/export',
      { format }
    );
    return response;
  }

  /**
   * Generate PDF with selected flashcards
   */
  async generateFlashcardPDF(
    documentId: string,
    cardIds?: string[],
    includeAnswers: boolean = true
  ): Promise<ExportResponse> {
    const payload: Record<string, unknown> = {
      format: 'pdf',
      includeAnswers,
    };
    if (cardIds) {
      payload.card_ids = cardIds;
    }

    const response = await apiClient.post<ExportResponse>(
      `/documents/${documentId}/flashcards/export`,
      payload
    );
    return response;
  }

  /**
   * Generate CSV with flashcard data
   */
  async generateFlashcardCSV(
    documentId: string,
    includeProgress: boolean = false
  ): Promise<ExportResponse> {
    const response = await apiClient.post<ExportResponse>(
      `/documents/${documentId}/flashcards/export`,
      {
        format: 'csv',
        includeProgress,
      }
    );
    return response;
  }

  /**
   * Download export file by URL
   * This should be handled by the browser directly
   */
  downloadFile(downloadUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default new ExportService();
