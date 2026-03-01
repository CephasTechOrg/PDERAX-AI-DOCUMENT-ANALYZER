/**
 * Document Management Service
 * Handles document upload, retrieval, and deletion
 */

import apiClient from './api';
import { Document, PaginatedResponse, UploadDocumentRequest } from '@/types';

class DocumentService {
  /**
   * Upload a document file
   * Sends multipart/form-data request with file
   */
  async uploadDocument(request: UploadDocumentRequest): Promise<Document> {
    const response = await apiClient.upload<Document>(
      '/api/v1/upload',
      request.file,
      request.document_type ? { document_type: request.document_type } : undefined
    );
    return response;
  }

  /**
   * Get all documents for current user
   * Returns paginated list with filters
   */
  async getDocuments(
    page: number = 1,
    page_size: number = 10,
    status?: string
  ): Promise<PaginatedResponse<Document>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    const response = await apiClient.get<PaginatedResponse<Document>>(
      `/api/v1/history/analyses?${params.toString()}`
    );
    return response;
  }

  /**
   * Get single document details
   */
  async getDocument(documentId: string): Promise<Document> {
    const response = await apiClient.get<Document>(`/api/v1/history/analyses/${documentId}`);
    return response;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/api/v1/history/analyses/${documentId}`
    );
    return response;
  }

  /**
   * Get document processing status
   */
  async getDocumentStatus(documentId: string): Promise<Document> {
    const response = await apiClient.get<Document>(
      `/api/v1/history/analyses/${documentId}`
    );
    return response;
  }

  /**
   * Share document with other users (future feature)
   */
  async shareDocument(
    documentId: string,
    email: string
  ): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      `/api/v1/history/analyses/${documentId}/share`,
      { email }
    );
    return response;
  }
}

export default new DocumentService();
