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
      '/documents/upload',
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
      `/documents?${params.toString()}`
    );
    return response;
  }

  /**
   * Get single document details
   */
  async getDocument(documentId: string): Promise<Document> {
    const response = await apiClient.get<Document>(`/documents/${documentId}`);
    return response;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/documents/${documentId}`
    );
    return response;
  }

  /**
   * Get document processing status
   */
  async getDocumentStatus(documentId: string): Promise<Document> {
    const response = await apiClient.get<Document>(
      `/documents/${documentId}/status`
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
      `/documents/${documentId}/share`,
      { email }
    );
    return response;
  }
}

export default new DocumentService();
