/**
 * Document Analyzer Page (Protected)
 * Placeholder for Phase 3 implementation
 */

'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function AnalyzerPage() {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Document Analyzer</h1>
        <p className={styles.subtitle}>
          Upload documents and transform them with AI
        </p>
      </div>

      {/* Welcome Message */}
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeContent}>
          <h2>Welcome, {user?.full_name || user?.email.split('@')[0]}!</h2>
          <p>
            You've successfully logged in. This is a protected page that only
            authenticated users can access.
          </p>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className={styles.placeholderSection}>
        <h3>Coming in Phase 3</h3>
        <p>
          Document upload, processing, flashcard generation, and more will be
          implemented in Phase 3 of the migration.
        </p>
        <ul>
          <li>📄 Document upload functionality</li>
          <li>🔄 File processing and extraction</li>
          <li>🎓 Flashcard generation</li>
          <li>📊 Summary generation</li>
          <li>💬 AI chat interface</li>
        </ul>
      </div>

      {/* Status Info */}
      <div className={styles.statusCard}>
        <h4>Authentication Status</h4>
        <p>✅ You are logged in as: <strong>{user?.email}</strong></p>
        <p>✅ Role: <strong>{user?.role}</strong></p>
        <p>✅ API client is ready for Phase 3 implementation</p>
      </div>
    </div>
  );
}
