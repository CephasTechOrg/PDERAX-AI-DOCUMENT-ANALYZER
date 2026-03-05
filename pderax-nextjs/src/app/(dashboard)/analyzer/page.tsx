'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PieChart, FileText, Zap, CheckCircle, CloudUpload,
  FolderOpen, CircleCheck, Sparkles, Upload, Brain,
  Layers, History, ArrowRight, GripHorizontal, Clock,
} from 'lucide-react';
import { AnalysisProgress } from '@/components/analyzer/AnalysisProgress';
import { AnalysisResults } from '@/components/analyzer/AnalysisResults';
import { AnalysisResponse } from '@/types';
import documentService from '@/services/document_service';
import styles from './page.module.css';

const ACCEPTED_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

type ViewState = 'upload' | 'processing' | 'results' | 'error';

interface RecentDoc {
  id: string;
  filename: string;
  created_at: string;
  page_count?: number;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString();
}

export default function AnalyzerPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [totalDocCount, setTotalDocCount] = useState(0);
  // Generation config shown after analysis
  const [genCount, setGenCount] = useState(10);
  const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  useEffect(() => {
    documentService
      .getAnalyses()
      .then((docs) => {
        const allDocs = docs as unknown as RecentDoc[];
        setTotalDocCount(allDocs.length);
        setRecentDocs(allDocs.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  /* ── file validation ─────────────────────────────────── */
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds maximum size of 50MB`;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      return `File type not supported: ${file.name}`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
      setError(null);
    },
    [validateFile],
  );

  /* ── drag-and-drop handlers ──────────────────────────── */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  /* ── analysis handlers ───────────────────────────────── */
  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setView('processing');
    setError(null);

    try {
      const response = await documentService.uploadDocument(selectedFile);
      // Treat as success if we have extracted text, even on partial AI failure
      if (response.status === 'error' && !response.extracted_text) {
        throw new Error(response.error || 'Analysis failed');
      }
      setResult(response);
      setView('results');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to analyze document';
      setError(msg);
      setView('error');
    }
  }, [selectedFile]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setView('upload');
  }, []);

  const saveGenSettings = useCallback(() => {
    sessionStorage.setItem('study_settings', JSON.stringify({ count: genCount, difficulty: genDifficulty }));
  }, [genCount, genDifficulty]);

  const handleGenerateFlashcards = useCallback(
    (text: string) => {
      sessionStorage.setItem('study_text', text);
      saveGenSettings();
      router.push('/study-tools/flashcards');
    },
    [router, saveGenSettings],
  );

  const handleGenerateQuiz = useCallback(
    (text: string) => {
      sessionStorage.setItem('study_text', text);
      saveGenSettings();
      router.push('/study-tools/quiz');
    },
    [router, saveGenSettings],
  );

  // ── Results view ─────────────────────────────────────────
  if (view === 'results' && result) {
    return (
      <div className={styles.container}>
        <AnalysisResults
          result={result}
          onReset={handleReset}
          onGenerateFlashcards={handleGenerateFlashcards}
          onGenerateQuiz={handleGenerateQuiz}
        />

        {/* Inline generation config */}
        <div className={styles.genConfigCard}>
          <h3 className={styles.genConfigTitle}>Generate Study Material</h3>
          <p className={styles.genConfigSub}>Configure and generate from this document</p>
          <div className={styles.genConfigRow}>
            <div className={styles.genConfigGroup}>
              <label className={styles.genConfigLabel}>Items</label>
              <div className={styles.genSliderRow}>
                <input
                  type="range" min={5} max={20} value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className={styles.genSlider}
                />
                <span className={styles.genSliderVal}>{genCount}</span>
              </div>
            </div>
            <div className={styles.genConfigGroup}>
              <label className={styles.genConfigLabel}>Difficulty</label>
              <div className={styles.genDiffBtns}>
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    className={`${styles.genDiffBtn} ${genDifficulty === d ? styles.genDiffActive : ''}`}
                    onClick={() => setGenDifficulty(d)}
                    type="button"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.genConfigActions}>
            <button
              className={styles.genActionBtn}
              onClick={() => handleGenerateQuiz(result.extracted_text || result.analysis?.summary || '')}
            >
              Generate Quiz
            </button>
            <button
              className={`${styles.genActionBtn} ${styles.genActionBtnSecondary}`}
              onClick={() => handleGenerateFlashcards(result.extracted_text || result.analysis?.summary || '')}
            >
              Generate Flashcards
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Processing view ──────────────────────────────────────
  if (view === 'processing') {
    return (
      <div className={styles.container}>
        <AnalysisProgress isProcessing={true} />
      </div>
    );
  }

  // ── Upload view (default) ────────────────────────────────
  return (
    <div className={styles.container}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerIcon}>
          <PieChart size={36} />
        </div>
        <div className={styles.headerText}>
          <h1>Document Analyzer</h1>
          <p>
            Upload a document and let AI extract insights, summaries, and study
            materials.
          </p>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className={styles.statsRow}>
        <div className={styles.statBadge}>
          <FileText size={20} className={styles.statBadgeIcon} />
          <span>
            {totalDocCount} document{totalDocCount !== 1 ? 's' : ''} analyzed
          </span>
        </div>
        <div className={styles.statBadge}>
          <Zap size={20} className={styles.statBadgeIcon} />
          <span>6 formats supported</span>
        </div>
        <div className={styles.statBadge}>
          <CheckCircle size={20} className={styles.statBadgeIcon} />
          <span>AI-powered analysis</span>
        </div>
      </div>

      {/* ── Error Alert ─────────────────────────────────── */}
      {error && (
        <div className={styles.errorAlert} role="alert">
          {error}
          <button onClick={handleReset} className={styles.errorRetry}>
            Try Again
          </button>
        </div>
      )}

      {/* ── Upload Zone ─────────────────────────────────── */}
      <div
        className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneDragOver : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className={styles.uploadIcon}>
          <CloudUpload size={36} />
        </div>
        <h2 className={styles.uploadTitle}>
          {isDragging ? 'Drop your files here' : 'Drag and drop your files here'}
        </h2>
        <div className={styles.orText}>or</div>
        <label htmlFor="file-upload" className={styles.fileBtn}>
          <FolderOpen size={18} /> click to select files
        </label>
        <input
          type="file"
          id="file-upload"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileInput}
          className={styles.fileInput}
        />
        <div className={styles.fileTypes}>
          <FileText size={16} /> Supported formats: .pdf, .doc, .docx, .xls,
          .xlsx, .txt
        </div>
        <div className={styles.maxSize}>
          <CircleCheck size={14} className={styles.maxSizeIcon} /> Max file size:
          50MB
        </div>
      </div>

      {/* ── File Info Bar (when file selected) ──────────── */}
      {selectedFile && (
        <div className={styles.fileInfo}>
          <div className={styles.fileDetails}>
            <FileText size={20} className={styles.fileIcon} />
            <div>
              <span className={styles.fileName}>{selectedFile.name}</span>
              <span className={styles.fileSize}>
                {(selectedFile.size / 1024).toFixed(0)} KB
              </span>
            </div>
          </div>
          <button onClick={handleAnalyze} className={styles.analyzeBtn}>
            <Zap size={16} /> Analyze Document
          </button>
        </div>
      )}

      {/* ── How It Works ────────────────────────────────── */}
      <div className={styles.howItWorks}>
        <h2 className={styles.howItWorksTitle}>
          <Sparkles size={22} className={styles.howItWorksIcon} /> How it works
        </h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <Upload size={14} className={styles.stepIcon} /> 1. Upload
          </div>
          <div className={styles.step}>
            <Brain size={14} className={styles.stepIcon} /> 2. AI analysis
          </div>
          <div className={styles.step}>
            <Layers size={14} className={styles.stepIcon} /> 3. Get materials
          </div>
        </div>
      </div>

      {/* ── Feature Cards ───────────────────────────────── */}
      <div className={styles.featuresGrid}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <Brain size={26} />
          </div>
          <h3>AI-Powered Analysis</h3>
          <p>
            Get comprehensive summaries, key insights, and Q&amp;A pairs from any
            document. Our AI understands context and extracts the most valuable
            information.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <Layers size={26} />
          </div>
          <h3>Study Material Generation</h3>
          <p>
            Generate flashcards and quizzes directly from your analysis results.
            Turn any document into an interactive study session in seconds.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <FileText size={26} />
          </div>
          <h3>Multiple Formats</h3>
          <p>
            Supports PDF, DOCX, XLS, XLSX, and TXT files up to 50MB. Seamless
            extraction from spreadsheets, text, and rich documents.
          </p>
        </div>
      </div>

      {/* ── Recent Analyses ─────────────────────────────── */}
      {recentDocs.length > 0 && (
        <>
          <div className={styles.recentHeader}>
            <h3 className={styles.recentTitle}>
              <History size={20} /> Recent analyses
            </h3>
            <Link href="/history" className={styles.viewAll}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className={styles.recentGrid}>
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/history/analysis/${doc.id}`}
                className={styles.recentItem}
              >
                <div className={styles.recentIcon}>
                  <FileText size={24} />
                </div>
                <div className={styles.recentInfo}>
                  <div className={styles.recentFilename}>{doc.filename}</div>
                  <div className={styles.recentMeta}>
                    <Clock size={12} /> {timeAgo(doc.created_at)}
                    {doc.page_count ? ` · ${doc.page_count} pages` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Footer ──────────────────────────────────────── */}
      <div className={styles.footerNote}>
        <GripHorizontal size={12} /> analyzer · pderax
      </div>
    </div>
  );
}
