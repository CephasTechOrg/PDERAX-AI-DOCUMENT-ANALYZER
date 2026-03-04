'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, BookOpen, HelpCircle } from 'lucide-react';
import { AnalysisHistoryItem } from '@/types';
import documentService from '@/services/document_service';
import styles from './page.module.css';

export default function AnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [analysis, setAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    documentService
      .getAnalysis(id)
      .then(setAnalysis)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const composeStudyText = (item: AnalysisHistoryItem) => {
    const { analysis } = item;
    const parts: string[] = [];

    if (analysis.summary) parts.push(analysis.summary);
    if (analysis.insights?.length) {
      parts.push(`Key insights:\n${analysis.insights.join('\n')}`);
    }
    if (analysis.questions_answers?.length) {
      parts.push(
        analysis.questions_answers
          .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
          .join('\n\n')
      );
    }

    return parts.join('\n\n');
  };

  const goToFlashcards = () => {
    if (!analysis) return;
    sessionStorage.setItem('study_text', composeStudyText(analysis));
    router.push('/study-tools/flashcards');
  };

  const goToQuiz = () => {
    if (!analysis) return;
    sessionStorage.setItem('study_text', composeStudyText(analysis));
    router.push('/study-tools/quiz');
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 size={28} className={styles.spinner} />
          <p>Loading analysis…</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className={styles.container}>
        <Link href="/history" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to History
        </Link>
        <div className={styles.error}>{error || 'Analysis not found'}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/history" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to History
        </Link>
        <h1 className={styles.title}>{analysis.filename}</h1>
        <p className={styles.subtitle}>
          Created {new Date(analysis.created_at).toLocaleString()}
        </p>
      </div>

      <div className={styles.actions}>
        <button onClick={goToFlashcards} className={styles.actionBtn}>
          <BookOpen size={14} /> Generate Flashcards
        </button>
        <button onClick={goToQuiz} className={`${styles.actionBtn} ${styles.quizBtn}`}>
          <HelpCircle size={14} /> Generate Quiz
        </button>
      </div>

      <section className={styles.section}>
        <h2>Summary</h2>
        <p>{analysis.analysis.summary || 'No summary available.'}</p>
      </section>

      <section className={styles.section}>
        <h2>Key Insights</h2>
        {analysis.analysis.insights?.length ? (
          <ul className={styles.list}>
            {analysis.analysis.insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        ) : (
          <p>No insights available.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>Q&A</h2>
        {analysis.analysis.questions_answers?.length ? (
          <div className={styles.qaList}>
            {analysis.analysis.questions_answers.map((qa, idx) => (
              <div key={idx} className={styles.qaItem}>
                <p className={styles.question}>Q: {qa.question}</p>
                <p className={styles.answer}>A: {qa.answer}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No Q&A pairs available.</p>
        )}
      </section>
    </div>
  );
}
