/**
 * Flashcard List Component
 * Displays all flashcards for a document
 */

'use client';

import React from 'react';
import { Flashcard } from '@/types';
import FlashcardCard from './FlashcardCard';
import styles from './FlashcardList.module.css';

export interface FlashcardListProps {
  flashcards: Flashcard[];
  loading?: boolean;
  onCardCorrect?: (cardId: string) => void;
  onCardIncorrect?: (cardId: string) => void;
  onCardDelete?: (cardId: string) => void;
}

export const FlashcardList: React.FC<FlashcardListProps> = ({
  flashcards,
  loading = false,
  onCardCorrect,
  onCardIncorrect,
  onCardDelete,
}) => {
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading flashcards...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className={styles.empty}>
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
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <h3>No flashcards yet</h3>
        <p>Generate flashcards from your document to get started</p>
      </div>
    );
  }

  const easyCount = 0;
  const mediumCount = 0;
  const hardCount = 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Flashcards</h2>
        <p className={styles.count}>{flashcards.length} cards</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={`${styles.statBadge} ${styles.easy}`}></span>
          <span>{easyCount} Easy</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statBadge} ${styles.medium}`}></span>
          <span>{mediumCount} Medium</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statBadge} ${styles.hard}`}></span>
          <span>{hardCount} Hard</span>
        </div>
      </div>

      <div className={styles.list}>
        {flashcards.map((card, index) => (
          <div key={card.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <span className={styles.itemNumber}>Card {index + 1}</span>
              {onCardDelete && (
                <button
                  className={styles.deleteButton}
                  onClick={() => onCardDelete(card.id)}
                  title="Delete card"
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
                </button>
              )}
            </div>
            <FlashcardCard
              card={card}
              onCorrect={() => onCardCorrect?.(card.id)}
              onIncorrect={() => onCardIncorrect?.(card.id)}
              showActions={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardList;
