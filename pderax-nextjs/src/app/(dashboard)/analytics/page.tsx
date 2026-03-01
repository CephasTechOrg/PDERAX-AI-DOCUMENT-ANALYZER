/**
 * Analytics Page
 * Study progress and learning analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/forms/Button';
import analyticsService, {
  StudyStats,
  DocumentStats,
} from '@/services/analytics_service';
import exportService from '@/services/export_service';
import styles from './page.module.css';

export default function AnalyticsPage() {
  const { isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [documents, setDocuments] = useState<DocumentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      loadAnalytics();
    }
  }, [authLoading]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [statsData, docsData] = await Promise.all([
        analyticsService.getStudyStats(),
        analyticsService.getMostStudied(10),
      ]);

      setStats(statsData);
      setDocuments(docsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      const response = await exportService.exportProgressReport('pdf');
      exportService.downloadFile(response.download_url, response.filename);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Failed to load analytics</div>
      </div>
    );
  }

  const accuracyPercentage = Math.round(stats.average_accuracy * 100);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Learning Analytics</h1>
          <p className={styles.subtitle}>Track your study progress and achievements</p>
        </div>
        <Button
          variant="primary"
          onClick={handleExportReport}
          isLoading={isExporting}
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          Export Report
        </Button>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Key Metrics */}
      <section className={styles.metricsSection}>
        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{ background: '#e0e7ff' }}>
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div className={styles.metricInfo}>
            <p className={styles.metricLabel}>Study Sessions</p>
            <p className={styles.metricValue}>{stats.total_sessions}</p>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{ background: '#dcfce7' }}>
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className={styles.metricInfo}>
            <p className={styles.metricLabel}>Cards Studied</p>
            <p className={styles.metricValue}>{stats.total_cards_studied}</p>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{ background: '#fef3c7' }}>
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className={styles.metricInfo}>
            <p className={styles.metricLabel}>Accuracy</p>
            <p className={styles.metricValue}>{accuracyPercentage}%</p>
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{ background: '#e0e7ff' }}>
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
                d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10h.01M13 6h.01M3 13h2v8H3zm12-8v8m5 0h2V9h-2m0 0V7a2 2 0 10-4 0v2m0 0h-2.586a1 1 0 00-.707.293l-.913.914M6.657 17.085a2 2 0 10 2.828 2.828m-6.364-6.364a9 9 0 1012.728 0M9.305 7.295a3 3 0 104.243 4.243"
              />
            </svg>
          </div>
          <div className={styles.metricInfo}>
            <p className={styles.metricLabel}>Current Streak</p>
            <p className={styles.metricValue}>{stats.current_streak} days</p>
          </div>
        </div>
      </section>

      {/* Study Time */}
      <section className={styles.section}>
        <div className={styles.studyTimeCard}>
          <h3 className={styles.sectionTitle}>Total Study Time</h3>
          <p className={styles.largeValue}>{stats.total_study_time_minutes} minutes</p>
          <p className={styles.description}>
            That's {Math.round(stats.total_study_time_minutes / 60)} hours of learning
          </p>
        </div>
      </section>

      {/* Most Studied Documents */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Most Studied Documents</h2>
        
        {documents.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No study data yet. Start studying to see your progress!</p>
          </div>
        ) : (
          <div className={styles.documentsList}>
            {documents.map((doc, index) => (
              <div key={doc.document_id} className={styles.documentItem}>
                <div className={styles.documentRank}>#{index + 1}</div>
                <div className={styles.documentDetails}>
                  <p className={styles.documentTitle}>{doc.filename}</p>
                  <div className={styles.documentStats}>
                    <span>{doc.cards_studied} of {doc.total_cards} cards studied</span>
                    <span>•</span>
                    <span>{doc.study_sessions} sessions</span>
                  </div>
                </div>
                <div className={styles.accuracyBadge}>
                  <span className={styles.accuracyValue}>
                    {Math.round(doc.average_accuracy * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Progress Visualization */}
      <section className={styles.section}>
        <div className={styles.progressCard}>
          <h3 className={styles.sectionTitle}>Study Progress Distribution</h3>
          
          <div className={styles.progressBars}>
            <div className={styles.progressItem}>
              <div className={styles.progressLabel}>
                <span>Study Sessions</span>
                <span className={styles.progressValue}>{stats.total_sessions}</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(100, (stats.total_sessions / 50) * 100)}%`,
                    background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                  }}
                ></div>
              </div>
            </div>

            <div className={styles.progressItem}>
              <div className={styles.progressLabel}>
                <span>Cards Mastered</span>
                <span className={styles.progressValue}>
                  {Math.round((stats.average_accuracy * stats.total_cards_studied) / 100)}
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${stats.average_accuracy * 100}%`,
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <button className={styles.actionCard}>
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span>View Detailed Stats</span>
          </button>

          <button className={styles.actionCard}>
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
                d="M7 12a3 3 0 110-6 3 3 0 010 6zM7 12a3 3 0 110 6 3 3 0 010-6zM17 12a3 3 0 110-6 3 3 0 010 6zM17 12a3 3 0 110 6 3 3 0 010-6z"
              />
            </svg>
            <span>Set Study Goals</span>
          </button>

          <button className={styles.actionCard}>
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
            <span>View Achievements</span>
          </button>
        </div>
      </section>
    </div>
  );
}
