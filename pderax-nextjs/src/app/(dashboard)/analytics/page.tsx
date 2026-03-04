/**
 * Analytics Page — Pinnacle Design System
 * Study progress and learning analytics — uses /api/analytics/dashboard
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import analyticsService, { AnalyticsDashboard } from '@/services/analytics_service';
import {
  FileText, BookOpen, ClipboardCheck, Flame, Clock,
  TrendingUp, BarChart3, Loader2, Activity, MessageSquare,
  Upload, Zap, Calendar,
} from 'lucide-react';
import styles from './page.module.css';

/* ═══════════════════════════════════════════════════════════ */
/* Helpers                                                    */
/* ═══════════════════════════════════════════════════════════ */

function getGradeLetter(score: number) {
  if (score >= 90) return { letter: 'A', color: '#10b981', bg: '#ecfdf5' };
  if (score >= 80) return { letter: 'B', color: '#3b82f6', bg: '#eff6ff' };
  if (score >= 70) return { letter: 'C', color: '#f59e0b', bg: '#fffbeb' };
  if (score >= 60) return { letter: 'D', color: '#ef4444', bg: '#fef2f2' };
  return { letter: 'F', color: '#6b7280', bg: '#f9fafb' };
}

function getScoreColor(score: number) {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  if (score >= 60) return '#ef4444';
  return '#9ca3af';
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

const SUBJECT_COLORS = ['#0066B4', '#2A9D8F', '#E88C30', '#7C5CFC', '#E05C78', '#3B9CE8'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ACTIVITY_META: Record<string, { icon: React.ReactNode; bg: string; color: string; label: string }> = {
  document:  { icon: <Upload size={14} />,         bg: '#E6F0FA', color: '#0066B4', label: 'Upload' },
  flashcard: { icon: <BookOpen size={14} />,       bg: '#E6F5F0', color: '#2A9D8F', label: 'Flashcards' },
  quiz:      { icon: <ClipboardCheck size={14} />, bg: '#FFF5E6', color: '#E88C30', label: 'Quiz' },
  chat:      { icon: <MessageSquare size={14} />,  bg: '#E6F0FA', color: '#3B9CE8', label: 'Chat' },
};

/* ═══════════════════════════════════════════════════════════ */
/* Score Ring Component                                       */
/* ═══════════════════════════════════════════════════════════ */

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(score, 100));
  const dashOffset = circ - (filled / 100) * circ;
  const grade = getGradeLetter(score);
  const color = getScoreColor(score);

  return (
    <div className={styles.ringWrap}>
      <svg viewBox="0 0 100 100" className={styles.ringSvg}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F0F3F7" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke="url(#ringGrad)" strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringScore}>{Math.round(score)}%</span>
        <span className={styles.ringGrade} style={{ color: grade.color, background: grade.bg }}>
          {grade.letter}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Weekly Heatmap Dot Color                                   */
/* ═══════════════════════════════════════════════════════════ */

function getHeatColor(minutes: number): { bg: string; text: string } {
  if (minutes === 0) return { bg: '#F4F9FD', text: '#B0C4D4' };
  if (minutes < 15)  return { bg: '#D4E8F7', text: '#0066B4' };
  if (minutes < 45)  return { bg: '#A3D1F0', text: '#004D8A' };
  if (minutes < 90)  return { bg: '#0066B4', text: '#FFFFFF' };
  return { bg: '#004D8A', text: '#FFFFFF' };
}

/* ═══════════════════════════════════════════════════════════ */
/* Main Page                                                  */
/* ═══════════════════════════════════════════════════════════ */

export default function AnalyticsPage() {
  const { isLoading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const dashboard = await analyticsService.getDashboard();
      setData(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Weekly heatmap (hook must run before early returns) ── */
  const studyItems = data?.study_time?.items ?? [];
  const weeklyData = useMemo(() => {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0
    const result: { label: string; minutes: number; date: string }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - dayOfWeek + i);
      const dateStr = d.toISOString().split('T')[0];
      const match = studyItems.find((s) => s.date === dateStr);
      result.push({
        label: DAY_LABELS[i],
        minutes: match ? match.minutes : 0,
        date: dateStr,
      });
    }
    return result;
  }, [studyItems]);

  /* ── Loading ──────────────────────────────────────── */
  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 size={36} className={styles.spinner} />
          <p>Loading analytics…</p>
        </div>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────── */
  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Failed to load analytics'}</div>
      </div>
    );
  }

  const { stats, activity_feed, quiz_performance, study_time, subject_breakdown } = data;
  const avgScore = Math.round(stats.average_quiz_score ?? 0);
  const totalMinutes = stats.total_study_time ?? 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins  = totalMinutes % 60;

  const maxSubjectCount = Math.max(...subject_breakdown.items.map((s) => s.count), 1);
  const quizItems = quiz_performance.items.slice(0, 10);
  const avgQuizOfShown = quizItems.length > 0
    ? Math.round(quizItems.reduce((a, b) => a + b.score, 0) / quizItems.length)
    : 0;

  const hasContent =
    stats.total_documents > 0 ||
    stats.total_flashcard_sets > 0 ||
    stats.total_quizzes > 0;

  const streakMsg = stats.current_streak >= 7
    ? '🔥 Unstoppable!'
    : stats.current_streak >= 3
      ? '💪 Keep it up!'
      : stats.current_streak >= 1
        ? '✨ Good start!'
        : '🚀 Start today!';

  /* ═════════════════════════════════════════════════════ */
  /* Render                                               */
  /* ═════════════════════════════════════════════════════ */

  return (
    <div className={styles.container}>

      {/* ── Page Header ──────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerIcon}>
          <BarChart3 size={32} />
        </div>
        <div className={styles.headerTextBlock}>
          <h1>Learning Analytics</h1>
          <p>Track your study progress and performance</p>
        </div>
      </header>

      {/* ── KPI Pill Badges ──────────────────────────── */}
      <div className={styles.kpiGrid}>
        {[
          { icon: <FileText size={18} />, value: stats.total_documents, label: 'Documents', bg: '#E6F0FA', color: '#0066B4' },
          { icon: <BookOpen size={18} />,  value: stats.total_flashcard_sets, label: 'Flashcard Sets', bg: '#E6F5F0', color: '#2A9D8F' },
          { icon: <ClipboardCheck size={18} />, value: stats.total_quizzes, label: 'Quizzes Taken', bg: '#FFF5E6', color: '#E88C30' },
          { icon: <Flame size={18} />,     value: stats.current_streak, label: 'Day Streak', bg: '#FFEDE6', color: '#E05C78' },
        ].map((kpi, i) => (
          <div key={i} className={styles.kpi}>
            <div className={styles.kpiIcon} style={{ background: kpi.bg, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiValue}>{kpi.value}</span>
              <span className={styles.kpiLabel}>{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Overview Row ─────────────────────────────── */}
      <div className={styles.overviewRow}>

        {/* Score Ring Card */}
        <div className={styles.scoreCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <TrendingUp size={18} className={styles.cardTitleIcon} />
              Average Quiz Score
            </h2>
          </div>
          <ScoreRing score={avgScore} />
          <p className={styles.ringSubtext}>
            Based on {stats.total_quizzes} quiz{stats.total_quizzes !== 1 ? 'zes' : ''}
          </p>
        </div>

        {/* Study Time Card */}
        <div className={styles.studyTime}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Clock size={18} className={styles.cardTitleIcon} />
              Study Time
            </h2>
          </div>
          <div className={styles.studyTimeMain}>
            <span className={styles.studyTimeValue}>
              {hours > 0 ? `${hours}h ` : ''}{mins}m
            </span>
            <span className={styles.studyTimeLabel}>Total learning time</span>
          </div>
          <div className={styles.studyTimeStats}>
            <div className={styles.studyTimeStat}>
              <span className={styles.studyTimeStatValue}>{stats.documents_this_week}</span>
              <span className={styles.studyTimeStatLabel}>Docs this week</span>
            </div>
            <div className={styles.studyTimeStat}>
              <span className={styles.studyTimeStatValue}>{stats.quiz_attempts_this_week}</span>
              <span className={styles.studyTimeStatLabel}>Quizzes this week</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quiz Performance Chart (full width) ──────── */}
      {quizItems.length > 0 && (
        <div className={`${styles.card} ${styles.fullRow}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <BarChart3 size={18} className={styles.cardTitleIcon} />
              Quiz Performance
            </h2>
            <span className={styles.cardSub}>Last {quizItems.length} quizzes</span>
          </div>
          <div className={styles.quizChartWrap}>
            <div className={styles.chartArea}>
              {/* Y-axis */}
              <div className={styles.chartYAxis}>
                {[100, 75, 50, 25, 0].map((v) => (
                  <span key={v} className={styles.chartYLabel}>{v}</span>
                ))}
              </div>

              {/* Bars */}
              <div className={styles.chartBars}>
                {/* Grid lines */}
                <div className={styles.chartGridLines}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className={styles.chartGridLine} />
                  ))}
                </div>

                {/* Average line */}
                <div
                  className={styles.chartAvgLine}
                  style={{ bottom: `calc(${avgQuizOfShown}% + 1.75rem)` }}
                >
                  <span className={styles.chartAvgLabel}>Avg {avgQuizOfShown}%</span>
                </div>

                {/* Bar columns */}
                {quizItems.map((p, i) => {
                  const grade = getGradeLetter(p.score);
                  const pct = Math.max(p.score, 3);
                  return (
                    <div key={i} className={styles.chartCol}>
                      <div className={styles.chartColInner}>
                        <span className={styles.chartColScore}>{Math.round(p.score)}%</span>
                        <div className={styles.chartColTrack}>
                          <div
                            className={styles.chartColFill}
                            style={{
                              height: `${pct}%`,
                              background: `linear-gradient(180deg, ${grade.color}, ${grade.color}dd)`,
                            }}
                          />
                        </div>
                        <span className={styles.chartColGrade} style={{ color: grade.color, background: grade.bg }}>
                          {grade.letter}
                        </span>
                      </div>
                      <span className={styles.chartColDate}>
                        {p.date
                          ? new Date(p.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                          : `#${i + 1}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Row: Subjects + Activity ──────────── */}
      <div className={styles.bottomRow}>

        {/* Subjects */}
        {subject_breakdown.items.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <BookOpen size={18} className={styles.cardTitleIcon} />
                Subjects
              </h2>
              <span className={styles.cardSub}>{subject_breakdown.items.length} topics</span>
            </div>
            <div className={styles.subjectList}>
              {subject_breakdown.items.map((item, i) => {
                const pct = Math.round((item.count / maxSubjectCount) * 100);
                const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                return (
                  <div key={i} className={styles.subjectItem}>
                    <div className={styles.subjectHeader}>
                      <span className={styles.subjectName}>{item.subject}</span>
                      <span className={styles.subjectCount}>
                        {item.count} doc{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className={styles.subjectBarTrack}>
                      <div
                        className={styles.subjectBarFill}
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {activity_feed.items.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <Activity size={18} className={styles.cardTitleIcon} />
                Recent Activity
              </h2>
            </div>
            <div className={styles.activityTimeline}>
              {activity_feed.items.slice(0, 8).map((item, i) => {
                const meta = ACTIVITY_META[item.type] ?? {
                  icon: <Activity size={14} />, bg: '#F0F3F7', color: '#6b7280', label: 'Activity',
                };
                return (
                  <div key={i} className={styles.activityItem}>
                    <div className={styles.activityIcon} style={{ background: meta.bg, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className={styles.activityContent}>
                      <p className={styles.activityDesc}>{item.description}</p>
                      <div className={styles.activityMeta}>
                        <span className={styles.activityTime}>{formatTimeAgo(item.timestamp)}</span>
                        <span
                          className={styles.activityBadge}
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Weekly Activity Heatmap ──────────────────── */}
      <div className={`${styles.card} ${styles.fullRow}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Calendar size={18} className={styles.cardTitleIcon} />
            Weekly Study Activity
          </h2>
          <span className={styles.cardSub}>This week</span>
        </div>
        <div className={styles.weekGrid}>
          {weeklyData.map((day, i) => {
            const heat = getHeatColor(day.minutes);
            return (
              <div key={i} className={styles.weekDay}>
                <span className={styles.weekDayLabel}>{day.label}</span>
                <div
                  className={styles.weekDayDot}
                  style={{ background: heat.bg, color: heat.text }}
                  title={`${day.label}: ${day.minutes}m`}
                >
                  {day.minutes > 0 ? `${day.minutes}m` : '–'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Streak Card ─────────────────────────────── */}
      <div className={styles.streakCard}>
        <div className={styles.streakIcon} style={{ background: '#FFEDE6' }}>
          🔥
        </div>
        <div className={styles.streakInfo}>
          <span className={styles.streakValue}>{stats.current_streak} day{stats.current_streak !== 1 ? 's' : ''}</span>
          <span className={styles.streakLabel}>Current study streak</span>
        </div>
        <span className={styles.streakMotivation} style={{ background: '#F4F9FD', color: '#0066B4' }}>
          {streakMsg}
        </span>
      </div>

      {/* ── Empty State ─────────────────────────────── */}
      {!hasContent && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <BarChart3 size={36} />
          </div>
          <h3>No data yet</h3>
          <p>Upload a document and start studying to see your analytics here.</p>
        </div>
      )}
    </div>
  );
}
