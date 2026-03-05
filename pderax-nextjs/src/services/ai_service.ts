/**
 * AI Assistant Service
 * Matches backend: POST/GET /api/v1/chat/sessions, POST /sessions/{id}/message, etc.
 */

import apiClient from './api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sender_name?: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string | null;
  mode: string;
  document_filename: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

class AIAssistantService {
  /** Create a new chat session */
  async createSession(
    mode: 'teacher' | 'helper' = 'teacher',
    title?: string
  ): Promise<ChatSession> {
    const payload: Record<string, unknown> = { mode };
    if (title) payload.title = title;
    return apiClient.post<ChatSession>('/api/v1/chat/sessions', payload);
  }

  /** List all sessions (newest first) — backend returns flat array */
  async getSessions(): Promise<ChatSession[]> {
    const data = await apiClient.get<ChatSession[]>('/api/v1/chat/sessions');
    return Array.isArray(data) ? data : [];
  }

  /** Get a session with full message history */
  async getSession(sessionId: string): Promise<ChatSessionDetail> {
    return apiClient.get<ChatSessionDetail>(`/api/v1/chat/sessions/${sessionId}`);
  }

  /** Delete a session */
  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/api/v1/chat/sessions/${sessionId}`);
  }

  /** Update session title or mode */
  async updateSession(
    sessionId: string,
    updates: { title?: string; mode?: string }
  ): Promise<ChatSession> {
    return apiClient.put<ChatSession>(`/api/v1/chat/sessions/${sessionId}`, updates);
  }

  /**
   * Send a message and get the AI reply.
   * Backend returns { message: ChatMessage, session_id: string }
   */
  async sendMessage(
    sessionId: string,
    content: string
  ): Promise<ChatMessage> {
    const response = await apiClient.post<{ message: ChatMessage; session_id: string }>(
      `/api/v1/chat/sessions/${sessionId}/message`,
      { content }
    );
    return response.message;
  }

  /** Upload a document into a session for context */
  async uploadDocument(
    sessionId: string,
    file: File
  ): Promise<{ success: boolean; filename: string; context_length: number }> {
    return apiClient.upload(`/api/v1/chat/sessions/${sessionId}/upload`, file);
  }
}

export default new AIAssistantService();
