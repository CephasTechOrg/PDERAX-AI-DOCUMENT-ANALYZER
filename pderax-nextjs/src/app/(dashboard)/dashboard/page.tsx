/**
 * Dashboard Page
 * Main dashboard showing user stats and quick actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import documentService from '@/services/document_service';
import { Document } from '@/types';
import styles from './page.module.css';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    completedDocuments: 0,
    processingDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      loadDashboardData();
    }
  }, [authLoading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await documentService.getDocuments(1, 10);

      setRecentDocuments(response.items.slice(0, 5));
      setStats({
        totalDocuments: response.total,
        completedDocuments: response.items.filter(
          (d) => d.status === 'completed'
        ).length,
        processingDocuments: response.items.filter(
          (d) => d.status === 'processing'
        ).length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Welcome Section */}
      <section className={styles.welcomeSection}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.title}>
            Welcome back, <span className={styles.highlight}>{user?.name}</span>
          </h1>
          <p className={styles.subtitle}>
            Here's what you've been working on
          </p>
        </div>

        <div className={styles.welcomeAction}>
          <Link href="/dashboard/upload" className={styles.uploadCTA}>
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Upload
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className={styles.statsSection}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e0e7ff' }}>
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
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Total Documents</p>
            <p className={styles.statValue}>{stats.totalDocuments}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7' }}>
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
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Ready to Study</p>
            <p className={styles.statValue}>{stats.completedDocuments}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7' }}>
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
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Processing</p>
            <p className={styles.statValue}>{stats.processingDocuments}</p>
          </div>
        </div>
      </section>

      {/* Recent Documents */}
      <section className={styles.recentSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Documents</h2>
          <Link href="/dashboard/history" className={styles.viewAll}>
            View All →
          </Link>
        </div>

        {recentDocuments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No documents yet. Start by uploading your first document!</p>
            <Link href="/dashboard/upload" className={styles.primaryButton}>
              Upload Document
            </Link>
          </div>
        ) : (
          <div className={styles.documentGrid}>
            {recentDocuments.map((doc) => (
              <div key={doc.id} className={styles.documentCard}>
                <div className={styles.documentCardHeader}>
                  <svg
                    className={styles.documentIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div className={styles.documentTitle}>{doc.filename}</div>
                </div>

                <div className={styles.documentMeta}>
                  <span>{(doc.file_size / 1024 / 1024).toFixed(2)}MB</span>
                  <span>
                    {doc.status === 'completed' ? '✓ Ready' : `● ${doc.status}`}
                  </span>
                </div>

                {doc.status === 'completed' && (
                  <Link
                    href={`/dashboard/study/${doc.id}`}
                    className={styles.documentAction}
                  >
                    Start Studying →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Tips */}
      <section className={styles.tipsSection}>
        <h2 className={styles.sectionTitle}>Getting Started</h2>
        <div className={styles.tipsList}>
          <div className={styles.tip}>
            <div className={styles.tipNumber}>1</div>
            <div>
              <h4 className={styles.tipTitle}>Upload a Document</h4>
              <p className={styles.tipText}>
                Start by uploading a PDF, Word, or text file
              </p>
            </div>
          </div>

          <div className={styles.tip}>
            <div className={styles.tipNumber}>2</div>
            <div>
              <h4 className={styles.tipTitle}>AI Processing</h4>
              <p className={styles.tipText}>
                Our AI analyzes the content and generates flashcards
              </p>
            </div>
          </div>

          <div className={styles.tip}>
            <div className={styles.tipNumber}>3</div>
            <div>
              <h4 className={styles.tipTitle}>Study</h4>
              <p className={styles.tipText}>
                Review flashcards and track your learning progress
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
