/**
 * AI Assistant Service
 * Handles chat interactions and AI-powered features
 */

import apiClient from './api';

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  document_id?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  document_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

class AIAssistantService {
  /**
   * Send a message to the AI assistant
   */
  async sendMessage(
    sessionId: string,
    content: string,
    documentId?: string
  ): Promise<ChatMessage> {
    const payload: Record<string, unknown> = {
      content,
    };
    if (documentId) {
      payload.document_id = documentId;
    }

    const response = await apiClient.post<ChatMessage>(
      `/ai/sessions/${sessionId}/messages`,
      payload
    );
    return response;
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(
    sessionId: string,
    page: number = 1,
    page_size: number = 50
  ): Promise<{ items: ChatMessage[]; total: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
    });

    const response = await apiClient.get<{ items: ChatMessage[]; total: number }>(
      `/ai/sessions/${sessionId}/messages?${params.toString()}`
    );
    return response;
  }

  /**
   * Create a new chat session
   */
  async createSession(title: string, documentId?: string): Promise<ChatSession> {
    const payload: Record<string, unknown> = { title };
    if (documentId) {
      payload.document_id = documentId;
    }

    const response = await apiClient.post<ChatSession>(
      '/ai/sessions',
      payload
    );
    return response;
  }

  /**
   * Get all chat sessions for current user
   */
  async getSessions(
    page: number = 1,
    page_size: number = 20
  ): Promise<{ items: ChatSession[]; total: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
    });

    const response = await apiClient.get<{ items: ChatSession[]; total: number }>(
      `/ai/sessions?${params.toString()}`
    );
    return response;
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/ai/sessions/${sessionId}`
    );
    return response;
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    const response = await apiClient.get<ChatSession>(
      `/ai/sessions/${sessionId}`
    );
    return response;
  }

  /**
   * Ask a question about a specific document
   */
  async askAboutDocument(
    documentId: string,
    question: string
  ): Promise<{ answer: string }> {
    const response = await apiClient.post<{ answer: string }>(
      `/documents/${documentId}/ask`,
      { question }
    );
    return response;
  }

  /**
   * Generate summary for a document
   */
  async generateSummary(documentId: string): Promise<{ summary: string }> {
    const response = await apiClient.post<{ summary: string }>(
      `/documents/${documentId}/summarize`,
      {}
    );
    return response;
  }
}

export default new AIAssistantService();
