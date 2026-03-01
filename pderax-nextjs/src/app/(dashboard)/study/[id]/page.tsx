/**
 * Study Page
 * Main flashcard review and study interface
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import FlashcardCard from '@/components/flashcards/FlashcardCard';
import { Button } from '@/components/forms/Button';
import flashcardService from '@/services/flashcard_service';
import documentService from '@/services/document_service';
import { Document, Flashcard } from '@/types';
import styles from './page.module.css';

export default function StudyPage() {
  const { id: documentId } = useParams() as { id: string };
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  const [document, setDocument] = useState<Document | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<'review' | 'quiz'>('review');

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, documentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load document and flashcards in parallel
      const [doc, cardsResponse] = await Promise.all([
        documentService.getDocument(documentId),
        flashcardService.getFlashcards(documentId),
      ]);

      setDocument(doc);
      setFlashcards(cardsResponse.items);
      setStats({ correct: 0, incorrect: 0, total: cardsResponse.items.length });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load study materials';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrect = async () => {
    const currentCard = flashcards[currentCardIndex];
    try {
      await flashcardService.recordProgress(currentCard.id, true);
      setStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
      moveToNextCard();
    } catch (err) {
      console.error('Failed to record progress:', err);
    }
  };

  const handleIncorrect = async () => {
    const currentCard = flashcards[currentCardIndex];
    try {
      await flashcardService.recordProgress(currentCard.id, false);
      setStats((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
      moveToNextCard();
    } catch (err) {
      console.error('Failed to record progress:', err);
    }
  };

  const moveToNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      // Study session complete
      setStudyMode('quiz');
    }
  };

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStats({ correct: 0, incorrect: 0, total: stats.total });
    setStudyMode('review');
  };

  const handleBackToDocument = () => {
    router.push(`/dashboard/history`);
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading study materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error Loading Materials</h2>
          <p>{error}</p>
          <Button onClick={handleBackToDocument}>Back to Documents</Button>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2>No Flashcards</h2>
          <p>Generate flashcards from this document to start studying.</p>
          <Button onClick={handleBackToDocument}>Back to Documents</Button>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / flashcards.length) * 100;

  // Study complete screen
  if (studyMode === 'quiz') {
    const accuracy = Math.round(
      (stats.correct / (stats.correct + stats.incorrect)) * 100
    );

    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Study Session Complete!</h1>
        </header>

        <div className={styles.completeCard}>
          <div className={styles.scoreCircle}>
            <div className={styles.scoreValue}>{accuracy}%</div>
            <div className={styles.scoreLabel}>Accuracy</div>
          </div>

          <div className={styles.scoreDetails}>
            <div className={styles.scoreItem}>
              <span className={styles.scoreItemLabel}>Correct:</span>
              <span className={styles.scoreItemValue}>{stats.correct}</span>
            </div>
            <div className={styles.scoreItem}>
              <span className={styles.scoreItemLabel}>Incorrect:</span>
              <span className={styles.scoreItemValue}>{stats.incorrect}</span>
            </div>
            <div className={styles.scoreItem}>
              <span className={styles.scoreItemLabel}>Total:</span>
              <span className={styles.scoreItemValue}>{stats.total}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="primary" onClick={handleRestart} fullWidth>
              Review Again
            </Button>
            <Button variant="secondary" onClick={handleBackToDocument} fullWidth>
              Back to Documents
            </Button>
          </div>
        </div>

        {accuracy >= 80 && (
          <div className={styles.encouragement}>
            <p>🎉 Excellent work! You're mastering this material!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{document?.filename}</h1>
          <p className={styles.subtitle}>
            {currentCardIndex + 1} of {flashcards.length}
          </p>
        </div>
      </header>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className={styles.progressText}>{Math.round(progress)}% complete</p>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Correct:</span>
          <span className={`${styles.statValue} ${styles.correct}`}>
            {stats.correct}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Incorrect:</span>
          <span className={`${styles.statValue} ${styles.incorrect}`}>
            {stats.incorrect}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Accuracy:</span>
          <span className={styles.statValue}>
            {stats.correct + stats.incorrect === 0
              ? '-%'
              : `${Math.round(
                  (stats.correct / (stats.correct + stats.incorrect)) * 100
                )}%`}
          </span>
        </div>
      </div>

      {/* Flashcard */}
      <div className={styles.cardContainer}>
        <FlashcardCard
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={setIsFlipped}
          onCorrect={handleCorrect}
          onIncorrect={handleIncorrect}
          showActions={true}
        />
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        <Button
          variant="secondary"
          onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
          disabled={currentCardIndex === 0}
        >
          ← Previous
        </Button>

        <span className={styles.cardNumber}>
          {currentCardIndex + 1} / {flashcards.length}
        </span>

        <Button
          variant="secondary"
          onClick={() =>
            setCurrentCardIndex(
              Math.min(flashcards.length - 1, currentCardIndex + 1)
            )
          }
          disabled={currentCardIndex === flashcards.length - 1}
        >
          Next →
        </Button>
      </div>

      <div className={styles.footerActions}>
        <Button variant="ghost" onClick={handleBackToDocument} fullWidth>
          Back to Documents
        </Button>
      </div>
    </div>
  );
}
