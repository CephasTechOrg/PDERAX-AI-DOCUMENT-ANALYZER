/**
 * AI Assistant Page
 * Main chat interface with AI assistant
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import ChatMessageComponent from '@/components/ai/ChatMessage';
import ChatInput from '@/components/ai/ChatInput';
import { Button } from '@/components/forms/Button';
import aiService, { ChatSession } from '@/services/ai_service';
import { ChatMessage } from '@/services/ai_service';
import styles from './page.module.css';

export default function AIAssistantPage() {
  const { isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading) {
      loadSessions();
    }
  }, [authLoading]);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await aiService.getSessions();
      setSessions(response.items);
      
      if (response.items.length > 0) {
        setCurrentSession(response.items[0]);
        loadMessages(response.items[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(errorMessage);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await aiService.getChatHistory(sessionId);
      setMessages(response.items);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const session = await aiService.createSession('New Chat');
      setSessions([session, ...sessions]);
      setCurrentSession(session);
      setMessages([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentSession) return;

    try {
      setIsSending(true);
      setError(null);

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: Math.random().toString(),
        user_id: '',
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to AI
      const assistantMessage = await aiService.sendMessage(
        currentSession.id,
        content
      );
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSession(session);
    loadMessages(session.id);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Delete this chat session?')) return;

    try {
      await aiService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        if (sessions.length > 1) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          setCurrentSession(remaining[0]);
          loadMessages(remaining[0].id);
        } else {
          setCurrentSession(null);
          setMessages([]);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete session';
      setError(errorMessage);
    }
  };

  if (authLoading || isLoadingSessions) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Conversations</h2>
          <Button
            variant="primary"
            onClick={handleCreateSession}
            className={styles.newChatButton}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Chat
          </Button>
        </div>

        <div className={styles.sessionList}>
          {sessions.length === 0 ? (
            <p className={styles.noSessions}>No conversations yet</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`${styles.sessionItem} ${
                  currentSession?.id === session.id ? styles.active : ''
                }`}
                onClick={() => handleSelectSession(session)}
              >
                <div className={styles.sessionInfo}>
                  <p className={styles.sessionTitle}>{session.title}</p>
                  <p className={styles.sessionMeta}>
                    {session.message_count} messages
                  </p>
                </div>
                <button
                  className={styles.deleteSession}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  title="Delete session"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.chatArea}>
        {!currentSession ? (
          <div className={styles.emptyState}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3>Start a conversation</h3>
            <p>Click "New Chat" to begin talking with the AI assistant</p>
            <Button onClick={handleCreateSession}>Create First Chat</Button>
          </div>
        ) : (
          <>
            <div className={styles.messagesContainer}>
              {isLoadingMessages ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.newChatWelcome}>
                  <h3>Welcome to AI Assistant</h3>
                  <p>Ask questions about your documents or general topics</p>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessageComponent
                    key={message.id}
                    message={message}
                    isCurrentUser={message.role === 'user'}
                  />
                ))
              )}
              {error && <div className={styles.errorMessage}>{error}</div>}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isSending}
                disabled={isSending}
                placeholder="Ask anything..."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
