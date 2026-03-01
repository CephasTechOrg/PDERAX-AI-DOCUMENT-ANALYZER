/**
 * Chat Message Component
 * Displays individual chat messages in conversation
 */

'use client';

import React from 'react';
import { ChatMessage } from '@/services/ai_service';
import styles from './ChatMessage.module.css';

export interface ChatMessageComponentProps {
  message: ChatMessage;
  isCurrentUser?: boolean;
}

export const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({
  message,
  isCurrentUser = false,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`${styles.messageContainer} ${
        isCurrentUser ? styles.userMessage : styles.assistantMessage
      }`}
    >
      <div className={styles.message}>
        <p className={styles.content}>{message.content}</p>
        <span className={styles.time}>{formatTime(message.created_at)}</span>
      </div>
    </div>
  );
};

export default ChatMessageComponent;
