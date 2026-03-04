'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, ClipboardList, HelpCircle, Trash2, BookOpen, Eye,
  Loader2, ChevronRight, Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnalysisHistoryItem, FlashcardSet, QuizHistoryItem } from '@/types';
import documentService from '@/services/document_service';
import flashcardService from '@/services/flashcard_service';
import quizService from '@/services/quiz_service';
import styles from './page.module.css';

type Tab = 'analyses' | 'flashcards' | 'quizzes';

export default function HistoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('analyses');
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [quizSets, setQuizSets] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, f, q] = await Promise.all([
        documentService.getAnalyses(),
        flashcardService.getSets(),
        quizService.getSets(),
      ]);
      setAnalyses(a);
      setFlashcardSets(f);
      setQuizSets(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const deleteAnalysis = async (id: string) => {
    if (!confirm('Delete this analysis? This cannot be undone.')) return;
    await documentService.deleteAnalysis(id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  const deleteFlashcardSet = async (id: string) => {
    if (!confirm('Delete this flashcard set? This cannot be undone.')) return;
    await flashcardService.deleteSet(id);
    setFlashcardSets((prev) => prev.filter((f) => f.id !== id));
  };

  const deleteQuizSet = async (id: string) => {
    if (!confirm('Delete this quiz set? This cannot be undone.')) return;
    await quizService.deleteSet(id);
    setQuizSets((prev) => prev.filter((q) => q.id !== id));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'analyses', label: 'Analyses', count: analyses.length, icon: <FileText size={16} /> },
    { key: 'flashcards', label: 'Flashcard Sets', count: flashcardSets.length, icon: <ClipboardList size={16} /> },
    { key: 'quizzes', label: 'Quiz Sets', count: quizSets.length, icon: <HelpCircle size={16} /> },
  ];

  const filterAnalyses = analyses.filter((a) =>
    !search || a.filename.toLowerCase().includes(search.toLowerCase())
  );
  const filterFlashcards = flashcardSets.filter((f) =>
    !search || (f.title || '').toLowerCase().includes(search.toLowerCase())
  );
  const filterQuizzes = quizSets.filter((q) =>
    !search || (q.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.subtitle}>View and manage your past analyses, flashcard sets, and quizzes.</p>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            {t.label}
            <span className={`${styles.tabBadge} ${tab === t.key ? styles.tabBadgeActive : ''}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>
          <Loader2 size={28} className={styles.spinner} />
          <p>Loading your history…</p>
        </div>
      ) : (
        <>
          {/* Analyses */}
          {tab === 'analyses' && (
            <div className={styles.list}>
              {filterAnalyses.length === 0 && (
                <EmptyState
                  icon={<FileText size={40} />}
                  title={search ? 'No matching analyses' : 'No analyses yet'}
                  desc={search ? 'Try a different search term.' : 'Upload a document to get started.'}
                  actionLabel={!search ? 'Analyze a document' : undefined}
                  actionHref={!search ? '/analyzer' : undefined}
                />
              )}
              {filterAnalyses.map((a) => (
                <div key={a.id} className={styles.card}>
                  <div className={styles.cardIconWrap} style={{ background: '#E6F0FA' }}>
                    <FileText size={20} color="#0066B4" />
                  </div>
                  <div className={styles.cardBody}>
                    <span className={styles.cardTitle}>{a.filename}</span>
                    <div className={styles.cardMeta}>
                      {a.file_type && <span className={styles.tag}>{a.file_type.toUpperCase()}</span>}
                      {a.word_count ? <span>{a.word_count.toLocaleString()} words</span> : null}
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.viewBtn}
                      onClick={() => router.push(`/history/analysis/${a.id}`)}
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.deleteIconBtn}`}
                      title="Delete"
                      onClick={() => deleteAnalysis(a.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Flashcard sets */}
          {tab === 'flashcards' && (
            <div className={styles.list}>
              {filterFlashcards.length === 0 && (
                <EmptyState
                  icon={<ClipboardList size={40} />}
                  title={search ? 'No matching sets' : 'No flashcard sets yet'}
                  desc={search ? 'Try a different search term.' : 'Generate flashcards from the Study Tools.'}
                  actionLabel={!search ? 'Generate Flashcards' : undefined}
                  actionHref={!search ? '/study-tools/flashcards' : undefined}
                />
              )}
              {filterFlashcards.map((f) => (
                <div key={f.id} className={styles.card}>
                  <div className={styles.cardIconWrap} style={{ background: '#E6F0FA' }}>
                    <ClipboardList size={20} color="#0066B4" />
                  </div>
                  <div className={styles.cardBody}>
                    <span className={styles.cardTitle}>{f.title || 'Flashcard Set'}</span>
                    <div className={styles.cardMeta}>
                      <span>{f.card_count} cards</span>
                      <DiffBadge diff={f.difficulty} />
                      <span>{formatDate(f.created_at)}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.viewBtn}
                      onClick={() => router.push(`/study-tools/flashcards?set_id=${f.id}`)}
                    >
                      <BookOpen size={14} /> Study
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.deleteIconBtn}`}
                      title="Delete"
                      onClick={() => deleteFlashcardSet(f.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quiz sets */}
          {tab === 'quizzes' && (
            <div className={styles.list}>
              {filterQuizzes.length === 0 && (
                <EmptyState
                  icon={<HelpCircle size={40} />}
                  title={search ? 'No matching quizzes' : 'No quiz sets yet'}
                  desc={search ? 'Try a different search term.' : 'Generate a quiz from the Study Tools.'}
                  actionLabel={!search ? 'Generate a Quiz' : undefined}
                  actionHref={!search ? '/study-tools/quiz' : undefined}
                />
              )}
              {filterQuizzes.map((q) => (
                <div key={q.id} className={styles.card}>
                  <div className={styles.cardIconWrap} style={{ background: '#fffbeb' }}>
                    <HelpCircle size={20} color="#d97706" />
                  </div>
                  <div className={styles.cardBody}>
                    <span className={styles.cardTitle}>{q.title || 'Quiz'}</span>
                    <div className={styles.cardMeta}>
                      <span>{q.question_count} questions</span>
                      <DiffBadge diff={q.difficulty} />
                      <span>{formatDate(q.created_at)}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={`${styles.viewBtn} ${styles.viewBtnAmber}`}
                      onClick={() => router.push(`/study-tools/quiz?set_id=${q.id}`)}
                    >
                      <Eye size={14} /> Retake
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.deleteIconBtn}`}
                      title="Delete"
                      onClick={() => deleteQuizSet(q.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DiffBadge({ diff }: { diff: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    easy: { bg: '#f0fdf4', color: '#15803d' },
    medium: { bg: '#fffbeb', color: '#b45309' },
    hard: { bg: '#fef2f2', color: '#b91c1c' },
  };
  const c = colors[diff] || colors.medium;
  return (
    <span className={styles.diffBadge} style={{ background: c.bg, color: c.color }}>
      {diff}
    </span>
  );
}

function EmptyState({
  icon, title, desc, actionLabel, actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyDesc}>{desc}</p>
      {actionLabel && actionHref && (
        <a href={actionHref} className={styles.emptyAction}>
          {actionLabel} <ChevronRight size={14} />
        </a>
      )}
    </div>
  );
}
