'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Loader2,
  ClipboardList, Upload, History, FileText, CheckCircle, X, AlertCircle,
  Shuffle,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CardDifficulty, AnalysisHistoryItem, FlashcardSet } from '@/types';
import flashcardService from '@/services/flashcard_service';
import documentService from '@/services/document_service';
import styles from './page.module.css';

type Step = 'input' | 'processing' | 'deck';
type InputMode = 'paste' | 'upload' | 'history';

interface Card {
  front: string;
  back: string;
  category?: string;
}

function composeTextFromAnalysis(item: AnalysisHistoryItem): string {
  const { analysis } = item;
  const parts: string[] = [];
  if (analysis.summary) parts.push(analysis.summary);
  if (analysis.insights?.length) {
    parts.push('Key insights:\n' + analysis.insights.join('\n'));
  }
  if (analysis.questions_answers?.length) {
    const qaPairs = analysis.questions_answers
      .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join('\n\n');
    parts.push(qaPairs);
  }
  return parts.join('\n\n');
}

export default function FlashcardsPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<InputMode>('paste');

  const [text, setText] = useState('');
  const [analysisId, setAnalysisId] = useState<string | undefined>();

  // Upload mode
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History mode
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Generation settings
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<CardDifficulty>('medium');

  // Deck state
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSetId, setLoadingSetId] = useState(false);

  // Pre-fill from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('study_text');
    if (saved) {
      setText(saved);
      sessionStorage.removeItem('study_text');
    }
  }, []);

  // Load flashcard set from history if ?set_id= param present
  useEffect(() => {
    const setId = searchParams.get('set_id');
    if (!setId) return;
    setLoadingSetId(true);
    flashcardService.getSet(setId)
      .then((set: FlashcardSet) => {
        const validCards = (set.cards || []).filter((c) => c.front && c.back);
        if (validCards.length === 0) {
          setError('This flashcard set has no valid cards.');
          return;
        }
        setCards(validCards);
        setCurrentIndex(0);
        setFlipped(false);
        setStep('deck');
      })
      .catch(() => setError('Could not load flashcard set from history.'))
      .finally(() => setLoadingSetId(false));
  }, [searchParams]);

  // Load history when switching to history mode
  useEffect(() => {
    if (mode === 'history' && historyItems.length === 0) {
      setIsLoadingHistory(true);
      documentService.getAnalyses()
        .then((items) => setHistoryItems(items))
        .catch(() => setHistoryItems([]))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [mode, historyItems.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadedName(null);
      setText('');
      setAnalysisId(undefined);
    }
  };

  const handleUploadExtract = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await documentService.uploadDocument(uploadFile);
      const extracted = result.extracted_text || '';
      if (!extracted || extracted.length < 50) {
        setError('Could not extract enough text from this file. Try a different document.');
        return;
      }
      setText(extracted);
      setAnalysisId(result.analysis_id);
      setUploadedName(uploadFile.name);
    } catch {
      setError('Failed to extract text from file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectHistory = (item: AnalysisHistoryItem) => {
    const composed = composeTextFromAnalysis(item);
    setText(composed);
    setAnalysisId(item.id);
    setSelectedHistoryId(item.id);
  };

  const handleGenerate = useCallback(async () => {
    if (text.trim().length < 50) {
      setError('Please provide at least 50 characters of text.');
      return;
    }
    setStep('processing');
    setError(null);
    try {
      const result = await flashcardService.generate(text, count, difficulty, undefined, analysisId);
      const rawCards = result?.flashcards;
      if (!rawCards || !Array.isArray(rawCards) || rawCards.length === 0) {
        throw new Error('No flashcards were generated. Please try with different text.');
      }
      const validCards = rawCards.filter((c) => c.front && c.back);
      if (validCards.length === 0) {
        throw new Error('Generated flashcards were invalid. Please try again.');
      }
      setCards(validCards);
      setCurrentIndex(0);
      setFlipped(false);
      setStep('deck');
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || 'Failed to generate flashcards. Please try again.');
      setStep('input');
    }
  }, [text, count, difficulty, analysisId]);

  const resetInput = () => {
    setStep('input');
    setText('');
    setAnalysisId(undefined);
    setUploadFile(null);
    setUploadedName(null);
    setSelectedHistoryId(null);
    setError(null);
    setCards([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const next = () => { if (currentIndex < cards.length - 1) { setCurrentIndex((i) => i + 1); setFlipped(false); } };
  const prev = () => { if (currentIndex > 0) { setCurrentIndex((i) => i - 1); setFlipped(false); } };
  const restart = () => { setCurrentIndex(0); setFlipped(false); };
  const shuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
  };

  const readyToGenerate = text.trim().length >= 50;
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  // Loading set from URL param
  if (loadingSetId) {
    return (
      <div className={styles.container}>
        <div className={styles.processingBox}>
          <Loader2 size={40} className={styles.spinner} />
          <h2 className={styles.processingTitle}>Loading Flashcards</h2>
          <p className={styles.processingDesc}>Fetching your saved deck from history…</p>
        </div>
      </div>
    );
  }

  // ── Deck view ──────────────────────────────────────────────────────────────
  if (step === 'deck' && cards.length > 0) {
    const card = cards[currentIndex];
    return (
      <div className={styles.container}>
        <div className={styles.deckHeader}>
          <button onClick={resetInput} className={styles.backBtn}>
            <ArrowLeft size={16} /> New Set
          </button>
          <span className={styles.counter}>{currentIndex + 1} / {cards.length}</span>
          <div className={styles.deckActions}>
            <button onClick={shuffle} className={styles.deckBtn} title="Shuffle cards">
              <Shuffle size={15} />
            </button>
            <button onClick={restart} className={styles.deckBtn} title="Restart deck">
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Flip card */}
        <div
          className={`${styles.cardWrap} ${flipped ? styles.flipped : ''}`}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setFlipped((f) => !f); }}
          aria-label={flipped ? 'Show front' : 'Flip to see answer'}
        >
          <div className={styles.cardInner}>
            <div className={styles.cardFront}>
              {card.category && <span className={styles.cardCategory}>{card.category}</span>}
              <p className={styles.cardText}>{card.front}</p>
              <span className={styles.tapHint}>Click to flip →</span>
            </div>
            <div className={styles.cardBack}>
              {card.category && <span className={styles.cardCategory}>{card.category}</span>}
              <p className={styles.cardText}>{card.back}</p>
              <span className={styles.tapHint}>← Click to flip back</span>
            </div>
          </div>
        </div>

        <div className={styles.navBtns}>
          <button onClick={prev} disabled={currentIndex === 0} className={styles.navBtn}>
            <ChevronLeft size={18} /> Previous
          </button>
          <button onClick={next} disabled={currentIndex === cards.length - 1} className={styles.navBtn}>
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── Processing view ────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className={styles.container}>
        <div className={styles.processingBox}>
          <div className={styles.processingSpinnerWrap}>
            <Loader2 size={36} className={styles.spinner} />
          </div>
          <h2 className={styles.processingTitle}>Generating Flashcards</h2>
          <p className={styles.processingDesc}>AI is creating {count} flashcards…</p>
          <div className={styles.processingSteps}>
            <div className={styles.processingStep}><div className={styles.stepDot} /><span>Analyzing content</span></div>
            <div className={styles.processingStep}><div className={styles.stepDot} /><span>Creating front & back pairs</span></div>
            <div className={styles.processingStep}><div className={styles.stepDot} /><span>Organizing by topic</span></div>
          </div>
        </div>
      </div>
    );
  }

  // ── Input view ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/study-tools" className={styles.backLink}>
          <ArrowLeft size={16} /> Study Tools
        </Link>
        <h1 className={styles.title}>Generate Flashcards</h1>
        <p className={styles.subtitle}>Choose your source, then AI will build your flashcard deck.</p>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.errorClose}><X size={14} /></button>
        </div>
      )}

      {/* Mode tabs */}
      <div className={styles.modeTabs}>
        {([
          { id: 'paste' as InputMode, label: 'Paste Text', icon: <ClipboardList size={15} /> },
          { id: 'upload' as InputMode, label: 'Upload File', icon: <Upload size={15} /> },
          { id: 'history' as InputMode, label: 'From History', icon: <History size={15} /> },
        ]).map((tab) => (
          <button
            key={tab.id}
            className={`${styles.modeTab} ${mode === tab.id ? styles.modeTabActive : ''}`}
            onClick={() => { setMode(tab.id); setError(null); }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Paste mode */}
      {mode === 'paste' && (
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your notes, lecture text, or any study material here (min 50 characters)..."
          rows={10}
        />
      )}

      {/* Upload mode */}
      {mode === 'upload' && (
        <div className={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {!uploadedName ? (
            <>
              <div
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setUploadFile(f);
                }}
              >
                <FileText size={36} className={styles.dropIcon} />
                <p className={styles.dropLabel}>
                  {uploadFile ? uploadFile.name : 'Click or drag a file to upload'}
                </p>
                <p className={styles.dropHint}>PDF, DOCX, TXT, XLSX supported</p>
              </div>
              {uploadFile && (
                <button className={styles.extractBtn} onClick={handleUploadExtract} disabled={isUploading}>
                  {isUploading
                    ? <><Loader2 size={16} className={styles.spinSm} /> Extracting text…</>
                    : 'Extract Text'}
                </button>
              )}
            </>
          ) : (
            <div className={styles.uploadSuccess}>
              <CheckCircle size={20} className={styles.successIcon} />
              <div>
                <p className={styles.successName}>{uploadedName}</p>
                <p className={styles.successSub}>{text.length.toLocaleString()} characters extracted</p>
              </div>
              <button className={styles.clearBtn} onClick={() => { setUploadedName(null); setUploadFile(null); setText(''); setAnalysisId(undefined); }}>
                <X size={14} /> Change
              </button>
            </div>
          )}
        </div>
      )}

      {/* History mode */}
      {mode === 'history' && (
        <div className={styles.historyArea}>
          {isLoadingHistory ? (
            <div className={styles.historyLoading}><Loader2 size={24} className={styles.spinner} /> Loading history…</div>
          ) : historyItems.length === 0 ? (
            <div className={styles.historyEmpty}>
              <History size={32} />
              <p>No analyzed documents yet.</p>
              <Link href="/analyzer" className={styles.analyzerLink}>Go analyze a document first</Link>
            </div>
          ) : (
            <div className={styles.historyList}>
              <p className={styles.historyHint}>Select a previously analyzed document to use its content:</p>
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.historyItem} ${selectedHistoryId === item.id ? styles.historySelected : ''}`}
                  onClick={() => handleSelectHistory(item)}
                >
                  <FileText size={16} className={styles.historyIcon} />
                  <div className={styles.historyInfo}>
                    <span className={styles.historyName}>{item.filename}</span>
                    <span className={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  {selectedHistoryId === item.id && <CheckCircle size={16} className={styles.selectedCheck} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <div className={styles.settings}>
        <div className={styles.settingGroup}>
          <label className={styles.settingLabel}>Number of cards</label>
          <input type="range" min={3} max={30} value={count}
            onChange={(e) => setCount(Number(e.target.value))} className={styles.slider} />
          <span className={styles.settingValue}>{count}</span>
        </div>
        <div className={styles.settingGroup}>
          <label className={styles.settingLabel}>Difficulty</label>
          <div className={styles.difficultyBtns}>
            {(['easy', 'medium', 'hard'] as CardDifficulty[]).map((d) => (
              <button
                key={d}
                className={`${styles.diffBtn} ${difficulty === d ? styles.diffActive : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleGenerate} disabled={!readyToGenerate} className={styles.generateBtn}>
        {readyToGenerate
          ? `Generate ${count} Flashcards`
          : mode === 'paste' ? 'Enter at least 50 characters'
            : mode === 'upload'
              ? uploadedName ? `Generate ${count} Flashcards` : 'Upload and extract a file first'
              : selectedHistoryId ? `Generate ${count} Flashcards` : 'Select a document from history'}
      </button>
    </div>
  );
}
