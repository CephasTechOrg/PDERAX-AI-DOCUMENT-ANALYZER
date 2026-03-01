/**
 * Chat Input Component
 * Input field for sending messages to AI assistant
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './ChatInput.module.css';

export interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading = false,
  placeholder = 'Ask a question...',
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        150
      ) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl/Cmd + Enter or just Enter if shift not pressed
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const message = input.trim();
    if (!message || isLoading || disabled) return;

    try {
      setInput('');
      await onSend(message);
    } catch (error) {
      // Restore input on error
      setInput(message);
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={styles.textarea}
          rows={1}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading || disabled}
          className={styles.sendButton}
          title="Send message (Ctrl+Enter)"
          aria-label="Send message"
        >
          {isLoading ? (
            <span className={styles.spinner}></span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16151496 C3.50612381,0.9 2.40987166,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99701575 L3.03521743,10.4380088 C3.03521743,10.5951061 3.19218622,10.7522035 3.50612381,10.7522035 L16.6915026,11.5376905 C16.6915026,11.5376905 17.1624089,11.5376905 17.1624089,12.0089827 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
            </svg>
          )}
        </button>
      </div>
      <p className={styles.hint}>
        Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line
      </p>
    </div>
  );
};

export default ChatInput;
