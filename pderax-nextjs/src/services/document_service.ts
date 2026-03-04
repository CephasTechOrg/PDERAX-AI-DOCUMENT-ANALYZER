/**
 * Document Service
 * Handles document upload (returns full analysis) and history retrieval
 */

import apiClient from './api';
import {
  AnalysisResponse,
  AnalysisHistoryItem,
} from '@/types';

class DocumentService {
  /**
   * Upload & analyze a document.
   * Backend POST /api/v1/upload returns the full analysis result.
   */
  async uploadDocument(file: File): Promise<AnalysisResponse> {
    const response = await apiClient.upload<AnalysisResponse>('/api/v1/upload', file);
    return response;
  }

  /**
   * List all analyses for the current user.
   * Backend returns a flat array (NOT paginated).
   */
  async getAnalyses(): Promise<AnalysisHistoryItem[]> {
    const response = await apiClient.get<AnalysisHistoryItem[]>('/api/v1/history/analyses');
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get a single analysis by ID.
   */
  async getAnalysis(id: string): Promise<AnalysisHistoryItem> {
    const response = await apiClient.get<AnalysisHistoryItem>(`/api/v1/history/analyses/${id}`);
    return response;
  }

  /**
   * Delete an analysis.
   */
  async deleteAnalysis(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/history/analyses/${id}`);
  }

  /**
   * Download an exported file (TXT/DOCX/PDF) by filename.
   * Returns the backend download URL for direct linking.
   */
  getExportUrl(filename: string): string {
    return `${apiClient.getBaseUrl()}/api/v1/download/${encodeURIComponent(filename)}`;
  }
}

export default new DocumentService();
