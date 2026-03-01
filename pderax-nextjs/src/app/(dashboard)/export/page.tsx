/**
 * Export Management Page
 * Download and export flashcards, documents, and progress reports
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/forms/Button';
import documentService from '@/services/document_service';
import flashcardService from '@/services/flashcard_service';
import exportService, { ExportFormat } from '@/services/export_service';
import { Document } from '@/models/types';
import styles from './page.module.css';

interface ExportJob {
  id: string;
  type: 'flashcard' | 'document' | 'progress';
  title: string;
  format: ExportFormat;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
}

export default function ExportPage() {
  const { isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      loadDocuments();
      loadExportHistory();
    }
  }, [authLoading]);

  const loadDocuments = async () => {
    try {
      setIsLoadingDocs(true);
      const docs = await documentService.listDocuments(1, 100);
      setDocuments(docs.items);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const loadExportHistory = async () => {
    try {
      // Simulated export history - in real app, fetch from backend
      setExportJobs([]);
    } catch (err) {
      console.error('Failed to load export history:', err);
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocuments(newSelection);
  };

  const toggleAllDocuments = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map((d) => d.id)));
    }
  };

  const handleExportFlashcards = async () => {
    if (selectedDocuments.size === 0) {
      setError('Please select at least one document');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      const docIds = Array.from(selectedDocuments);
      const selectedDocs = documents.filter((d) => docIds.includes(d.id));

      for (const doc of selectedDocs) {
        const newJob: ExportJob = {
          id: `export_${Date.now()}`,
          type: 'flashcard',
          title: `Flashcards from ${doc.title}`,
          format: selectedFormat,
          status: 'processing',
          progress: 0,
          createdAt: new Date(),
        };

        setExportJobs((prev) => [newJob, ...prev]);

        try {
          const response = await exportService.exportFlashcards(
            doc.id,
            selectedFormat
          );

          exportService.downloadFile(
            response.download_url,
            response.filename
          );

          setExportJobs((prev) =>
            prev.map((job) =>
              job.id === newJob.id
                ? {
                    ...job,
                    status: 'completed',
                    progress: 100,
                    completedAt: new Date(),
                    downloadUrl: response.download_url,
                  }
                : job
            )
          );
        } catch (jobErr) {
          setExportJobs((prev) =>
            prev.map((job) =>
              job.id === newJob.id
                ? {
                    ...job,
                    status: 'failed',
                    completedAt: new Date(),
                  }
                : job
            )
          );
        }
      }

      setSelectedDocuments(new Set());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProgressReport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      const newJob: ExportJob = {
        id: `export_${Date.now()}`,
        type: 'progress',
        title: 'Progress Report',
        format: selectedFormat,
        status: 'processing',
        progress: 0,
        createdAt: new Date(),
      };

      setExportJobs((prev) => [newJob, ...prev]);

      const response = await exportService.exportProgressReport(selectedFormat);
      exportService.downloadFile(response.download_url, response.filename);

      setExportJobs((prev) =>
        prev.map((job) =>
          job.id === newJob.id
            ? {
                ...job,
                status: 'completed',
                progress: 100,
                completedAt: new Date(),
                downloadUrl: response.download_url,
              }
            : job
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || isLoadingDocs) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading export options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Export & Download</h1>
          <p className={styles.subtitle}>
            Export your flashcards and study data to various formats
          </p>
        </div>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Format Selection */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Select Export Format</h2>
        <div className={styles.formatGrid}>
          <label className={`${styles.formatCard} ${selectedFormat === 'pdf' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="format"
              value="pdf"
              checked={selectedFormat === 'pdf'}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
            />
            <div className={styles.formatIcon}>
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
            <div className={styles.formatName}>PDF</div>
            <div className={styles.formatDescription}>Best for printing & sharing</div>
          </label>

          <label className={`${styles.formatCard} ${selectedFormat === 'csv' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="format"
              value="csv"
              checked={selectedFormat === 'csv'}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
            />
            <div className={styles.formatIcon}>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className={styles.formatName}>CSV</div>
            <div className={styles.formatDescription}>Best for spreadsheets</div>
          </label>

          <label className={`${styles.formatCard} ${selectedFormat === 'json' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="format"
              value="json"
              checked={selectedFormat === 'json'}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
            />
            <div className={styles.formatIcon}>
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
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div className={styles.formatName}>JSON</div>
            <div className={styles.formatDescription}>Best for data backup</div>
          </label>
        </div>
      </section>

      {/* Flashcard Export */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Export Flashcards</h2>

        <div className={styles.documentSelector}>
          <div className={styles.selectorHeader}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={selectedDocuments.size === documents.length}
                onChange={toggleAllDocuments}
              />
              <span>
                {selectedDocuments.size > 0
                  ? `${selectedDocuments.size} document${selectedDocuments.size !== 1 ? 's' : ''} selected`
                  : 'Select All Documents'}
              </span>
            </label>
          </div>

          {documents.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className={styles.documentList}>
              {documents.map((doc) => (
                <label key={doc.id} className={styles.documentCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedDocuments.has(doc.id)}
                    onChange={() => toggleDocumentSelection(doc.id)}
                  />
                  <div className={styles.documentInfo}>
                    <div className={styles.documentName}>{doc.title}</div>
                    <div className={styles.documentMeta}>
                      {doc.flashcard_count || 0} flashcards • {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={styles.documentStatus}>
                    <span className={styles.badge}>{doc.status}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className={styles.exportActions}>
            <Button
              variant="primary"
              onClick={handleExportFlashcards}
              isLoading={isExporting}
              disabled={selectedDocuments.size === 0 || isExporting}
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export {selectedDocuments.size > 0 ? `${selectedDocuments.size} Document${selectedDocuments.size !== 1 ? 's' : ''}` : 'Flashcards'}
            </Button>
          </div>
        </div>
      </section>

      {/* Progress Report */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Export Progress Report</h2>
        <div className={styles.reportCard}>
          <div className={styles.reportInfo}>
            <h3>Complete Study Report</h3>
            <p>
              Export all your study statistics, learning progress, and
              achievements in a comprehensive report.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleExportProgressReport}
            isLoading={isExporting}
            disabled={isExporting}
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Export Report
          </Button>
        </div>
      </section>

      {/* Export History */}
      {exportJobs.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Exports</h2>
          <div className={styles.historyList}>
            {exportJobs.map((job) => (
              <div key={job.id} className={styles.historyItem}>
                <div className={styles.historyIcon}>
                  {job.status === 'completed' && (
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
                  )}
                  {job.status === 'failed' && (
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
                        d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {(job.status === 'processing' || job.status === 'queued') && (
                    <div className={styles.processingSpinner}></div>
                  )}
                </div>

                <div className={styles.historyDetails}>
                  <div className={styles.historyTitle}>{job.title}</div>
                  <div className={styles.historyMeta}>
                    {job.format.toUpperCase()} • {job.createdAt.toLocaleString()}
                  </div>
                  {job.status === 'processing' && (
                    <div className={styles.progressBarSmall}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                <div className={styles.historyAction}>
                  {job.status === 'completed' && job.downloadUrl && (
                    <a href={job.downloadUrl} download className={styles.downloadLink}>
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>
                  )}
                  <span className={`${styles.badge} ${styles[`badge-${job.status}`]}`}>
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
