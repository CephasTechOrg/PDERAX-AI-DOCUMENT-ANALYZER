'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/api';
import { User } from '@/types';
import analyticsService, { AnalyticsDashboard } from '@/services/analytics_service';
import flashcardService from '@/services/flashcard_service';
import quizService from '@/services/quiz_service';
import documentService from '@/services/document_service';
import { FlashcardSet, QuizHistoryItem } from '@/types';
import {
  FileSearch, BookOpen, MessageSquare, GraduationCap,
  Flame, Clock, ArrowRight, Upload, RotateCcw,
  ChevronRight, Zap, FileText, Trophy, Plus,
  Moon, Sun, Sunrise, BarChart2, Hourglass,
  Calendar, TrendingUp, Users, CheckCircle,
  Layers, PenSquare, LayoutGrid,
} from 'lucide-react';
import styles from './page.module.css';

interface RecentDoc {
  id: string;
  filename: string;
  created_at: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [quizSets, setQuizSets] = useState<QuizHistoryItem[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
    Promise.allSettled([
      apiClient.get<User>('/api/v1/auth/me').then(setUserProfile),
      analyticsService.getDashboard().then(setAnalytics),
      flashcardService.getSets().then((sets) => setFlashcardSets(sets.slice(0, 3))),
      quizService.getSets().then((sets) => setQuizSets(sets.slice(0, 3))),
      documentService.getAnalyses().then((docs) => {
        setRecentDocs((docs as unknown as RecentDoc[]).slice(0, 3));
      }),
    ]).catch((err) => {
      setHasError(true);
      setErrorMessage(
        err?.response?.data?.detail ||
        'Failed to load dashboard data. Please refresh or try again.'
      );
    }).finally(() => setIsLoading(false));
  }, []);

  // Drag-and-drop quick upload → navigate to analyzer
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) {
      addToast('Please drop a file to analyze', 'warning');
      return;
    }
    addToast(`Analyzing "${file.name}"...`, 'info');
    sessionStorage.setItem('pending_upload_name', file.name);
    router.push('/analyzer');
  }, [router]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    Promise.allSettled([
      apiClient.get<User>('/api/v1/auth/me').then(setUserProfile),
      analyticsService.getDashboard().then(setAnalytics),
      flashcardService.getSets().then((sets) => setFlashcardSets(sets.slice(0, 3))),
      quizService.getSets().then((sets) => setQuizSets(sets.slice(0, 3))),
      documentService.getAnalyses().then((docs) => {
        setRecentDocs((docs as unknown as RecentDoc[]).slice(0, 3));
      }),
    ]).catch((err) => {
      setHasError(true);
      setErrorMessage(
        err?.response?.data?.detail ||
        'Failed to load dashboard data. Please refresh or try again.'
      );
    }).finally(() => setIsLoading(false));
  };

  const stats = analytics?.stats;
  // Prefer fresh profile from /me, fall back to session user
  const activeUser = userProfile || user;
  const fullName = activeUser?.full_name?.trim() || null;
  const firstName = fullName
    ? fullName.split(' ')[0]
    : 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const GreetingIcon = hour < 12 ? Sunrise : hour < 17 ? Sun : Moon;
  const streak = stats?.current_streak ?? 0;
  const studyDaysThisWeek = Math.min(stats?.documents_this_week ?? 0, 7);
  const avgScore = Math.round(stats?.average_quiz_score ?? 0);
  const studyTimeHours = Math.round((stats?.total_study_time ?? 0) / 60);
  const studyTimeMinutes = (stats?.total_study_time ?? 0) % 60;
  const userInitials = (fullName || activeUser?.email || 'U')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');

  const hasAnyContent =
    flashcardSets.length > 0 || quizSets.length > 0 || recentDocs.length > 0;

  return (
    <div className={styles.container}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
        {/* ── Header row ─────────────────────────────────────────── */}
        <div className={styles.headerRow}>
          <div className={styles.greeting}>
            <div className={styles.greetingIcon}>
              <GreetingIcon size={24} />
            </div>
            <h1>{greeting}, <span className={styles.greetingName}>{firstName}</span>!</h1>
          </div>
          {streak > 0 && (
            <span className={styles.streakBadge}>
              <Flame size={14} className={styles.streakIcon} />
              {streak}d streak
            </span>
          )}
        </div>

        {/* ── Sub message ────────────────────────────────────────── */}
        <div className={styles.subMessage}>
          👉 {hasAnyContent
            ? 'Pick up where you left off or start something new.'
            : 'Upload your first document and let AI supercharge your studying.'}
        </div>

        {/* ── Error State ────────────────────────────────────────── */}
        {hasError && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>!</div>
            <h3>Unable to load dashboard</h3>
            <p>{errorMessage}</p>
            <div className={styles.errorActions}>
              <button className={styles.errorRetryBtn} onClick={handleRetry}>
                <RotateCcw size={14} /> Try Again
              </button>
              <a href="mailto:support@pderax.com" className={styles.errorContactBtn}>
                <MessageSquare size={14} /> Contact Support
              </a>
            </div>
          </div>
        )}

        {/* Loading feedback */}
        {isLoading && !hasError && (
          <LoadingFeedback message="Loading your dashboard..." />
        )}

        {/* ── Stats grid (3 columns) ────────────────────────────── */}
        <div className={styles.statsGrid}>
          {/* This week */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              <Calendar size={14} className={styles.statLabelIcon} />
              This week
            </div>
            <div className={styles.statValue}>
              {isLoading ? <SkeletonInline /> : (
                <>
                  {studyDaysThisWeek}/7 <span className={styles.statUnit}>days active</span>
                </>
              )}
            </div>
            <div className={styles.weekProgress}>
              {Array.from({ length: 7 }).map((_, i) => (
                <span
                  key={i}
                  className={`${styles.dot} ${i < studyDaysThisWeek ? styles.dotFilled : ''}`}
                />
              ))}
            </div>
          </div>

          {/* Avg Score */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              <TrendingUp size={14} className={styles.statLabelIcon} />
              Avg Score
            </div>
            <div className={styles.statValue}>
              {isLoading ? <SkeletonInline /> : (
                <>
                  {avgScore}<span className={styles.statUnit}>%</span>
                  <span className={styles.scoreRing}>{avgScore}%</span>
                </>
              )}
            </div>
          </div>

          {/* Study Time */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              <Clock size={14} className={styles.statLabelIcon} />
              Study Time
            </div>
            <div className={styles.statValue}>
              {isLoading ? <SkeletonInline /> : (
                <>
                  {studyTimeHours}<span className={styles.statUnit}>h</span>
                  <span className={styles.studyTag}>
                    <Hourglass size={12} /> {studyTimeMinutes} min
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Analytics card ─────────────────────────────────────── */}
        <div className={styles.analyticsCard}>
          <div className={styles.avatar}>{userInitials}</div>
          <div className={styles.analyticsMeta}>
            <span>Analytics</span>
            <span className={styles.analyticsMetaIcon}>·</span>
            <span>{fullName || firstName}</span>
            <GraduationCap size={14} className={styles.analyticsMetaIcon} />
            <span>{activeUser?.role === 'teacher' ? 'Teacher' : 'Student'}</span>
          </div>
        </div>

        {/* ── Two-column main grid ───────────────────────────────── */}
        <div className={styles.mainGrid}>
          {/* LEFT COLUMN: Continue Studying + Recent Quizzes */}
          <div>
            {/* Continue Studying */}
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionTitleIcon}><BookOpen size={16} /></span>
                Continue Studying
              </h3>
              <Link href="/study-tools/flashcards" className={styles.seeAll}>
                See all <ArrowRight size={12} />
              </Link>
            </div>

            {isLoading ? (
              <>
                <SkeletonListItem />
                <SkeletonListItem />
              </>
            ) : flashcardSets.length > 0 ? (
              flashcardSets.map((set) => (
                <div key={set.id} className={styles.listItem}>
                  <div className={styles.itemLeft}>
                    <div className={styles.itemIcon}>
                      <FileText size={18} />
                    </div>
                    <div className={styles.itemInfo}>
                      <p className={styles.itemTitle}>{set.title || 'Flashcards from document'}</p>
                      <p className={styles.itemMeta}>
                        <Layers size={10} className={styles.itemMetaIcon} />
                        {set.card_count} cards
                      </p>
                    </div>
                  </div>
                  <Link href={`/study-tools/flashcards?set_id=${set.id}`} className={styles.actionBtn}>
                    Study <ArrowRight size={12} />
                  </Link>
                </div>
              ))
            ) : (
              <div className={styles.listItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.itemIcon}>
                    <FileText size={18} />
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemTitle}>No flashcard sets yet</p>
                    <p className={styles.itemMeta}>Upload a document to generate flashcards</p>
                  </div>
                </div>
                <Link href="/analyzer" className={styles.actionBtn}>
                  Create <ArrowRight size={12} />
                </Link>
              </div>
            )}

            {/* Recent Quizzes */}
            <div className={styles.sectionHeader} style={{ marginTop: '2.2rem' }}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionTitleIcon}><PenSquare size={16} /></span>
                Recent Quizzes
              </h3>
              <Link href="/study-tools/quiz" className={styles.seeAll}>
                See all <ArrowRight size={12} />
              </Link>
            </div>

            {isLoading ? (
              <>
                <SkeletonListItem />
                <SkeletonListItem />
                <SkeletonListItem />
              </>
            ) : quizSets.length > 0 ? (
              quizSets.map((set, index) => (
                <div key={set.id} className={styles.listItem}>
                  <div className={styles.itemLeft}>
                    <div className={styles.itemIcon}>
                      <FileText size={18} />
                    </div>
                    <div className={styles.itemInfo}>
                      <p className={styles.itemTitle}>{set.title || 'Quiz from document'}</p>
                      <p className={styles.itemMeta}>
                        <MessageSquare size={10} className={styles.itemMetaIcon} />
                        {set.question_count} question{set.question_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Link href={`/study-tools/quiz?set_id=${set.id}`} className={styles.actionBtn}>
                    Retake
                  </Link>
                </div>
              ))
            ) : (
              <div className={styles.listItem}>
                <div className={styles.itemLeft}>
                  <div className={styles.itemIcon}>
                    <FileText size={18} />
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemTitle}>No quizzes yet</p>
                    <p className={styles.itemMeta}>Upload a document to generate quizzes</p>
                  </div>
                </div>
                <Link href="/analyzer" className={styles.actionBtn}>
                  Create <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Quick Access */}
          <div>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionTitleIcon}><Zap size={16} /></span>
                Quick Access
              </h3>
            </div>
            <div className={styles.quickGrid}>
              <Link href="/analyzer" className={`${styles.quickItem} ${styles.quickItemAnalyzer}`}>
                <div className={styles.quickIcon}><BarChart2 size={22} /></div>
                <h4 className={styles.quickTitle}>Analyzer</h4>
                <p className={styles.quickDescription}>Upload & analyze docs</p>
              </Link>
              <Link href="/study-tools/flashcards" className={`${styles.quickItem} ${styles.quickItemFlashcards}`}>
                <div className={styles.quickIcon}><Layers size={22} /></div>
                <h4 className={styles.quickTitle}>Flashcards</h4>
                <p className={styles.quickDescription}>Generate card decks</p>
              </Link>
              <Link href="/study-tools/quiz" className={`${styles.quickItem} ${styles.quickItemQuiz}`}>
                <div className={styles.quickIcon}><PenSquare size={22} /></div>
                <h4 className={styles.quickTitle}>Quiz</h4>
                <p className={styles.quickDescription}>Test your knowledge</p>
              </Link>
              <Link href="/ai-assistant" className={`${styles.quickItem} ${styles.quickItemChat}`}>
                <div className={styles.quickIcon}><MessageSquare size={22} /></div>
                <h4 className={styles.quickTitle}>AI Chat</h4>
                <p className={styles.quickDescription}>Your study tutor</p>
              </Link>
              <Link href="/classrooms" className={`${styles.quickItem} ${styles.quickItemClassrooms}`}>
                <div className={styles.quickIcon}><Users size={22} /></div>
                <h4 className={styles.quickTitle}>Classrooms</h4>
                <p className={styles.quickDescription}>Collaborate</p>
              </Link>
              <Link href="/history" className={`${styles.quickItem} ${styles.quickItemHistory}`}>
                <div className={styles.quickIcon}><Clock size={22} /></div>
                <h4 className={styles.quickTitle}>History</h4>
                <p className={styles.quickDescription}>All your materials</p>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Empty first-time state ─────────────────────────────── */}
        {!isLoading && !hasAnyContent && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><FileSearch size={36} /></div>
            <h3>Your study hub is ready</h3>
            <p>Upload a document to generate AI flashcards, quizzes, and summaries instantly.</p>
            <div className={styles.emptyActions}>
              <Link href="/analyzer" className={styles.emptyPrimaryBtn}>
                <Upload size={16} /> Analyze Document
              </Link>
              <Link href="/ai-assistant" className={styles.emptySecBtn}>
                <MessageSquare size={16} /> Chat with AI
              </Link>
            </div>
          </div>
        )}

        {/* ── Add document card ──────────────────────────────────── */}
        <div
          className={`${styles.addCard} ${isDragging ? styles.addCardDragging : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => router.push('/analyzer')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.addIcon}>
            <Plus size={32} />
          </div>
          <div className={styles.addText}>
            <h3>{isDragging ? 'Drop to analyze' : 'Add a new document'}</h3>
            <p>Get AI insights, flashcards, and quiz questions in under a minute</p>
          </div>
        </div>

      {/* ── Footer note ────────────────────────────────────────── */}
      <div className={styles.footerNote}>
        <LayoutGrid size={10} /> pderax · institution-grade clarity with color accents
      </div>
    </div>
  );
}

/* ── Helper components ────────────────────────────────────────────────── */

function SkeletonListItem() {
  return (
    <div className={styles.listItem} style={{ opacity: 0.6 }}>
      <div className={styles.itemLeft}>
        <div className={`${styles.skeleton}`} style={{ width: 44, height: 44, borderRadius: 24 }} />
        <div className={styles.itemInfo}>
          <div className={styles.skeleton} style={{ width: 180, height: 14, borderRadius: 8 }} />
          <div className={styles.skeleton} style={{ width: 80, height: 10, borderRadius: 6, marginTop: 6 }} />
        </div>
      </div>
      <div className={styles.skeleton} style={{ width: 70, height: 30, borderRadius: 60 }} />
    </div>
  );
}

function SkeletonInline() {
  return (
    <div className={styles.skeleton} style={{ width: 80, height: 32, borderRadius: 8 }} />
  );
}

function LoadingFeedback({ message = 'Loading your dashboard...' }: { message?: string }) {
  return (
    <div className={styles.loadingFeedback}>
      <div className={styles.loadingSpinner} />
      <span>{message}</span>
    </div>
  );
}

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: (id: string) => void;
}

function Toast({ id, type, message, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`${styles.toast} ${styles[type]} ${isExiting ? styles.toastExit : ''}`}>
      <span className={styles.toastIcon}>{icons[type]}</span>
      <span className={styles.toastMessage}>{message}</span>
      <button
        className={styles.toastClose}
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(id), 300);
        }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: ToastProps[]; onClose: (id: string) => void }) {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
