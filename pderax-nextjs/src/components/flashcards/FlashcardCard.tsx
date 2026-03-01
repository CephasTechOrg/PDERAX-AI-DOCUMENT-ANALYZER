/**
 * Flashcard Display Component
 * Shows a single flashcard with flip animation
 */

'use client';

import React, { useState } from 'react';
import { Flashcard } from '@/types';
import styles from './FlashcardCard.module.css';

export interface FlashcardCardProps {
  card: Flashcard;
  isFlipped?: boolean;
  onFlip?: (isFlipped: boolean) => void;
  onCorrect?: () => void;
  onIncorrect?: () => void;
  showActions?: boolean;
}

export const FlashcardCard: React.FC<FlashcardCardProps> = ({
  card,
  isFlipped: initialFlipped = false,
  onFlip,
  onCorrect,
  onIncorrect,
  showActions = true,
}) => {
  const [isFlipped, setIsFlipped] = useState(initialFlipped);

  const handleFlip = () => {
    const newState = !isFlipped;
    setIsFlipped(newState);
    onFlip?.(newState);
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
        onClick={handleFlip}
      >
        <div className={styles.cardInner}>
          {/* Front - Question */}
          <div className={styles.cardFront}>
            <div className={styles.cardLabel}>Question</div>
            <div className={styles.cardContent}>
              <p>{card.question}</p>
            </div>
            <div className={styles.cardHint}>Click to reveal answer</div>
          </div>

          {/* Back - Answer */}
          <div className={styles.cardBack}>
            <div className={styles.cardLabel}>Answer</div>
            <div className={styles.cardContent}>
              <p>{card.answer}</p>
            </div>
            <div className={styles.cardHint}>Click to see question</div>
          </div>
        </div>
      </div>

      {showActions && (
        <div className={styles.actions}>
          <button
            className={`${styles.actionButton} ${styles.incorrect}`}
            onClick={onIncorrect}
            title="Mark as incorrect"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Incorrect
          </button>

          <button
            className={`${styles.actionButton} ${styles.correct}`}
            onClick={onCorrect}
            title="Mark as correct"
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Correct
          </button>
        </div>
      )}

      <div className={styles.difficulty}>
        <span
          className={`${styles.badge} ${styles[card.difficulty]}`}
        >
          {card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1)}
        </span>
      </div>
    </div>
  );
};

export default FlashcardCard;
