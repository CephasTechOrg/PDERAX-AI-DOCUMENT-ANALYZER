/**
 * History Page
 * View all documents and their study progress
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import DocumentList from '@/components/upload/DocumentList';
import { Button } from '@/components/forms/Button';
import documentService from '@/services/document_service';
import { Document } from '@/types';
import styles from './page.module.css';

export default function HistoryPage() {
  const { isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      loadDocuments();
    }
  }, [authLoading, filterStatus]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await documentService.getDocuments(1, 50, filterStatus || undefined);
      setDocuments(response.items);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentService.deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setSuccessMessage('Document deleted successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const completedDocs = documents.filter((d) => d.status === 'completed').length;
  const processingDocs = documents.filter((d) => d.status === 'processing').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Documents</h1>
          <p className={styles.subtitle}>
            Manage your uploaded documents and study materials
          </p>
        </div>
        <Link href="/dashboard/upload" className={styles.uploadButton}>
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
          Upload New
        </Link>
      </header>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{documents.length}</div>
          <div className={styles.statLabel}>Total Documents</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{completedDocs}</div>
          <div className={styles.statLabel}>Ready to Study</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{processingDocs}</div>
          <div className={styles.statLabel}>Processing</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${!filterStatus ? styles.active : ''}`}
          onClick={() => setFilterStatus(null)}
        >
          All ({documents.length})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'completed' ? styles.active : ''}`}
          onClick={() => setFilterStatus('completed')}
        >
          Completed ({completedDocs})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'processing' ? styles.active : ''}`}
          onClick={() => setFilterStatus('processing')}
        >
          Processing ({processingDocs})
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}

      {/* Document List */}
      <DocumentList
        documents={documents}
        loading={isLoading}
        onDelete={handleDeleteDocument}
      />

      {/* Quick Links */}
      <div className={styles.quickLinks}>
        <h3 className={styles.quickLinksTitle}>Quick Links</h3>
        <div className={styles.quickLinksGrid}>
          <Link href="/dashboard/upload" className={styles.quickLink}>
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
            <span>Upload Document</span>
          </Link>
          <Link href="/dashboard/dashboard" className={styles.quickLink}>
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
                d="M3 12l2-3m4 0l2 3m4 0l2-3m4 0l2 3M3 12a9 9 0 0118 0m-9 9v-6m0 0c-3.3 0-6-1.343-6-3s2.7-3 6-3 6 1.343 6 3-2.7 3-6 3z"
              />
            </svg>
            <span>Dashboard</span>
          </Link>
          <a href="#" className={styles.quickLink}>
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
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            <span>Settings</span>
          </a>
        </div>
      </div>
    </div>
  );
}
