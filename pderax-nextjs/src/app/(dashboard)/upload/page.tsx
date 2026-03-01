/**
 * Document Upload Page
 * Main page for uploading documents and viewing upload history
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import FileDropZone from '@/components/upload/FileDropZone';
import DocumentList from '@/components/upload/DocumentList';
import { Button } from '@/components/forms/Button';
import documentService from '@/services/document_service';
import { Document } from '@/types';
import styles from './page.module.css';

export default function UploadPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await documentService.getDocuments(1, 20);
      setDocuments(response.items);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      setSuccessMessage(null);

      const newDocument = await documentService.uploadDocument({
        file: selectedFile,
      });

      setSuccessMessage(
        `Document "${selectedFile.name}" uploaded successfully! Processing started...`
      );
      setSelectedFile(null);

      // Add new document to the list
      setDocuments([newDocument, ...documents]);

      // Poll for updates
      pollDocumentStatus(newDocument.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const pollDocumentStatus = async (documentId: string, attempts = 0) => {
    if (attempts > 30) return; // Stop after 5 minutes

    setTimeout(async () => {
      try {
        const updated = await documentService.getDocument(documentId);
        setDocuments((prev) =>
          prev.map((doc) => (doc.id === documentId ? updated : doc))
        );

        // Continue polling if still processing
        if (updated.status === 'processing') {
          pollDocumentStatus(documentId, attempts + 1);
        }
      } catch (error) {
        console.error('Failed to check document status:', error);
      }
    }, 10000); // Check every 10 seconds
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentService.deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setSuccessMessage('Document deleted successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Delete failed';
      setUploadError(errorMessage);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Document Upload</h1>
          <p className={styles.subtitle}>
            Upload PDF, Word, or text documents to generate flashcards
          </p>
        </div>
      </header>

      {/* Upload Section */}
      <section className={styles.section}>
        <div className={styles.uploadBox}>
          <h2 className={styles.sectionTitle}>Upload New Document</h2>

          {successMessage && (
            <div className={styles.successMessage}>{successMessage}</div>
          )}

          {uploadError && (
            <div className={styles.errorMessage}>{uploadError}</div>
          )}

          <FileDropZone
            onFilesSelected={handleFilesSelected}
            accept=".pdf,.doc,.docx,.txt"
            maxSize={50 * 1024 * 1024}
            disabled={isUploading}
          />

          {selectedFile && (
            <div className={styles.selectedFile}>
              <div className={styles.selectedFileInfo}>
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
                <div>
                  <p className={styles.selectedFileName}>
                    {selectedFile.name}
                  </p>
                  <p className={styles.selectedFileSize}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                </div>
              </div>
              <button
                className={styles.clearButton}
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
              >
                Clear
              </button>
            </div>
          )}

          <div className={styles.uploadActions}>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              isLoading={isUploading}
              fullWidth
            >
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </div>
      </section>

      {/* Documents Section */}
      <section className={styles.section}>
        <DocumentList
          documents={documents}
          loading={isLoadingDocuments}
          onDelete={handleDeleteDocument}
        />
      </section>

      {/* Info Box */}
      <section className={styles.infoBox}>
        <h3 className={styles.infoTitle}>How it works</h3>
        <ol className={styles.infoList}>
          <li>Upload a document (PDF, Word, or text file)</li>
          <li>Our AI analyzes the content and generates flashcards</li>
          <li>Review and study the flashcards in Study Tools</li>
          <li>Track your learning progress over time</li>
        </ol>
      </section>
    </div>
  );
}
