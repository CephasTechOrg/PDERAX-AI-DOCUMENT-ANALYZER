/**
 * Document List Component
 * Displays user's uploaded documents with status and actions
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Document, DocumentStatus } from '@/types';
import styles from './DocumentList.module.css';

export interface DocumentListProps {
  documents: Document[];
  loading?: boolean;
  onDelete?: (documentId: string) => Promise<void>;
  onShare?: (documentId: string) => void;
}

const statusConfig: Record<DocumentStatus, { label: string; color: string }> =
  {
    pending: { label: 'Pending', color: '#f59e0b' },
    processing: { label: 'Processing', color: '#3b82f6' },
    completed: { label: 'Completed', color: '#10b981' },
    failed: { label: 'Failed', color: '#ef4444' },
  };

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  loading = false,
  onDelete,
  onShare,
}) => {
  if (loading) {
    return <div className={styles.loading}>Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className={styles.empty}>
        <svg
          className={styles.emptyIcon}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className={styles.emptyTitle}>No documents yet</h3>
        <p className={styles.emptyDescription}>
          Upload your first document to get started
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Documents</h2>
        <p className={styles.subtitle}>{documents.length} document(s)</p>
      </div>

      <div className={styles.list}>
        {documents.map((doc) => {
          const status = statusConfig[doc.status];
          const uploadDate = new Date(doc.uploaded_at).toLocaleDateString();

          return (
            <div key={doc.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <div className={styles.itemInfo}>
                  <svg
                    className={styles.fileIcon}
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

                  <div className={styles.details}>
                    <h3 className={styles.itemTitle}>{doc.filename}</h3>
                    <p className={styles.itemMeta}>
                      {(doc.file_size / 1024 / 1024).toFixed(2)}MB •{' '}
                      {doc.pages && `${doc.pages} pages • `}
                      Uploaded {uploadDate}
                    </p>
                  </div>
                </div>

                <div className={styles.status} style={{ color: status.color }}>
                  <span className={styles.statusDot}></span>
                  {status.label}
                </div>
              </div>

              {doc.content_summary && (
                <p className={styles.summary}>{doc.content_summary}</p>
              )}

              <div className={styles.actions}>
                {doc.status === 'completed' && (
                  <>
                    <Link
                      href={`/dashboard/study/${doc.id}`}
                      className={styles.actionButton}
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
                          d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 12s4.5 5.747 10 5.747m0-13c5.5 0 10 4.745 10 5.747S17.5 17.747 12 17.747m0-13v13"
                        />
                      </svg>
                      Study
                    </Link>

                    <button
                      className={styles.actionButton}
                      onClick={() => onShare?.(doc.id)}
                      title="Share document"
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
                          d="M8.684 13.342C9.589 12.938 10 12.502 10 12c0-.502-.411-.938-1.316-1.342m0 2.684a3 3 0 110-2.684m9.108-3.342C19.589 3.938 20 4.374 20 5c0 .502-.411.938-1.316 1.342m0-2.684a3 3 0 010 2.684m1.318-7.684c.589.892.589 2.109 0 3m0-3c-.589-.891-.589-2.108 0-3"
                        />
                      </svg>
                      Share
                    </button>
                  </>
                )}

                <button
                  className={`${styles.actionButton} ${styles.danger}`}
                  onClick={() => onDelete?.(doc.id)}
                  title="Delete document"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentList;
