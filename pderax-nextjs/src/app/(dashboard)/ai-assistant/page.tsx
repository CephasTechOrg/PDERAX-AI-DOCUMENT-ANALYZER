/**
 * AI Assistant Page
 * Chat interface with session sidebar, mode toggle, document upload
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import aiService, { ChatSession, ChatMessage } from '@/services/ai_service';
import {
  Plus, Trash2, MessageSquare, GraduationCap, Wrench,
  Send, Loader2, Bot, User, FileText, Paperclip,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import styles from './page.module.css';

export default function AIAssistantPage() {
  const { isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'teacher' | 'helper'>('teacher');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) loadSessions();
  }, [authLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const list = await aiService.getSessions();
      setSessions(list);
      if (list.length > 0) {
        selectSession(list[0]);
      }
    } catch {
      setError('Failed to load chat sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const selectSession = async (session: ChatSession) => {
    setActiveSession(session);
    setMode(session.mode as 'teacher' | 'helper');
    setError(null);
    try {
      setIsLoadingMessages(true);
      const detail = await aiService.getSession(session.id);
      setMessages(detail.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      setError(null);
      const session = await aiService.createSession(mode);
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
    } catch {
      setError('Failed to create session');
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await aiService.deleteSession(id);
      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);
      if (activeSession?.id === id) {
        if (remaining.length > 0) {
          selectSession(remaining[0]);
        } else {
          setActiveSession(null);
          setMessages([]);
        }
      }
    } catch {
      setError('Failed to delete session');
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeSession || isSending) return;

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput('');
    setIsSending(true);
    setError(null);

    try {
      const reply = await aiService.sendMessage(activeSession.id, text);
      setMessages((prev) => [...prev, reply]);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, message_count: s.message_count + 2 }
            : s
        )
      );
    } catch {
      setError('Failed to get AI response. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;

    try {
      setError(null);
      const result = await aiService.uploadDocument(activeSession.id, file);
      if (result.success) {
        const uploadMsg: ChatMessage = {
          id: `upload-${Date.now()}`,
          role: 'assistant',
          content: `Document "${result.filename}" uploaded successfully. I now have context from this document (${result.context_length} characters). Ask me anything about it!`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, uploadMsg]);
      }
    } catch {
      setError('Failed to upload document');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (authLoading || isLoadingSessions) {
    return (
      <div className={styles.loadingPage}>
        <Loader2 size={32} className={styles.spin} />
        <p>Loading AI Assistant...</p>
      </div>
    );
  }

  return (
    <div className={styles.chatLayout}>
      {/* Session sidebar */}
      <aside className={`${styles.sessionBar} ${sidebarOpen ? '' : styles.sessionBarCollapsed}`}>
        <div className={styles.sessionHeader}>
          <h3 className={styles.sessionHeading}>{sidebarOpen ? 'Chats' : ''}</h3>
          <div className={styles.sessionHeaderBtns}>
            {sidebarOpen && (
              <button className={styles.newBtn} onClick={handleCreateSession} title="New chat">
                <Plus size={16} />
              </button>
            )}
            <button
              className={styles.collapseBtn}
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          </div>
        </div>

        {sidebarOpen && (
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === 'teacher' ? styles.modeActive : ''}`}
              onClick={() => setMode('teacher')}
            >
              <GraduationCap size={14} /> Teacher
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'helper' ? styles.modeActive : ''}`}
              onClick={() => setMode('helper')}
            >
              <Wrench size={14} /> Helper
            </button>
          </div>
        )}

        <div className={`${styles.sessionList} ${!sidebarOpen ? styles.sessionListHidden : ''}`}>
          {sessions.length === 0 ? (
            <p className={styles.emptySessions}>No conversations yet</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`${styles.sessionItem} ${activeSession?.id === s.id ? styles.sessionActive : ''}`}
                onClick={() => selectSession(s)}
              >
                <MessageSquare size={14} className={styles.sessionIcon} />
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionName}>{s.title || 'New Chat'}</span>
                  <span className={styles.sessionMeta}>
                    {s.message_count} msgs
                    {s.document_filename && <> &middot; <FileText size={11} /></>}
                  </span>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className={styles.chatArea}>
        {!activeSession ? (
          <div className={styles.welcome}>
            <Bot size={48} className={styles.welcomeIcon} />
            <h2>AI Study Assistant</h2>
            <p>Upload documents and get help studying, understanding concepts, and preparing for exams.</p>
            <button className={styles.startBtn} onClick={handleCreateSession}>
              <Plus size={18} /> Start New Chat
            </button>
          </div>
        ) : (
          <>
            <div className={styles.messages}>
              {isLoadingMessages ? (
                <div className={styles.loadingMessages}>
                  <Loader2 size={24} className={styles.spin} />
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyChat}>
                  <Bot size={36} className={styles.welcomeIcon} />
                  <p>Start the conversation! Ask a question or upload a document.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgUser : styles.msgAssistant}`}
                  >
                    <div className={styles.msgAvatar}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={styles.msgBubble}>
                      <div className={styles.msgContent}>{msg.content}</div>
                      <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className={`${styles.msgRow} ${styles.msgAssistant}`}>
                  <div className={styles.msgAvatar}><Bot size={16} /></div>
                  <div className={styles.msgBubble}>
                    <div className={styles.typing}><span /><span /><span /></div>
                  </div>
                </div>
              )}

              {error && <div className={styles.errorMsg}>{error}</div>}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputBar}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className={styles.attachBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Upload document"
              >
                <Paperclip size={18} />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                disabled={isSending}
                rows={1}
                className={styles.textarea}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                title="Send"
              >
                {isSending ? <Loader2 size={18} className={styles.spin} /> : <Send size={18} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
