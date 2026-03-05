'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, RotateCcw,
  ClipboardList, Upload, History, FileText, CheckCircle, X,
  Trophy, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QuizQuestion, AnalysisHistoryItem, QuizHistoryItem } from '@/types';
import quizService from '@/services/quiz_service';
import documentService from '@/services/document_service';
import styles from './page.module.css';

type Step = 'input' | 'processing' | 'quiz' | 'results';
type InputMode = 'paste' | 'upload' | 'history';

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

export default function QuizPage() {
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

  // Quiz settings
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSetId, setLoadingSetId] = useState(false);

  // Pre-fill from sessionStorage (from analyzer page)
  useEffect(() => {
    const saved = sessionStorage.getItem('study_text');
    if (saved) {
      setText(saved);
      sessionStorage.removeItem('study_text');
    }
    const savedSettings = sessionStorage.getItem('study_settings');
    if (savedSettings) {
      try {
        const { count: c, difficulty: d } = JSON.parse(savedSettings);
        if (typeof c === 'number') setCount(c);
        if (d) setDifficulty(d);
      } catch { /* ignore */ }
      sessionStorage.removeItem('study_settings');
    }
  }, []);

  // Load quiz set from history if ?set_id= param present
  useEffect(() => {
    const setId = searchParams.get('set_id');
    if (!setId) return;
    setLoadingSetId(true);
    quizService.getSet(setId)
      .then((set: QuizHistoryItem) => {
        const qs = set.questions.filter(
          (q) => q.question && Array.isArray(q.options) && q.options.length > 0
        );
        if (qs.length === 0) {
          setError('This quiz set has no valid questions.');
          return;
        }
        setQuestions(qs);
        setCurrentQ(0);
        setAnswers({});
        setShowExplanation(false);
        setStep('quiz');
      })
      .catch(() => setError('Could not load quiz set from history.'))
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
      // Auto-extract immediately on selection
      handleUploadExtractFromFile(file);
    }
  };

  const handleUploadExtractFromFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await documentService.uploadDocument(file);
      const extracted = result.extracted_text || '';
      if (!extracted || extracted.length < 50) {
        setError('Could not read enough text from this file. Try a PDF, DOCX, or TXT with more content.');
        return;
      }
      setText(extracted);
      setAnalysisId(result.analysis_id);
      setUploadedName(file.name);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || 'Could not read this file. Please try a different format.');
    } finally {
      setIsUploading(false);
    }
  };

  // Keep for drag-drop re-extraction
  const handleUploadExtract = () => {
    if (uploadFile) handleUploadExtractFromFile(uploadFile);
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
      const result = await quizService.generate(text, count, difficulty, analysisId);
      // Defensive validation of the response
      const rawQuestions = result?.questions;
      if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error('No questions were generated. Please try with different text.');
      }
      // Filter to only valid questions (must have question text and options array)
      const validQuestions = rawQuestions.filter(
        (q) => q.question && Array.isArray(q.options) && q.options.length > 0
      );
      if (validQuestions.length === 0) {
        throw new Error('Generated questions were malformed. Please try again.');
      }
      setQuestions(validQuestions);
      setCurrentQ(0);
      setAnswers({});
      setShowExplanation(false);
      setStep('quiz');
    } catch (err: unknown) {
      const apiErr = err as { message?: string; code?: string };
      const msg = apiErr?.message || 'Quiz generation failed. Please try again with different text.';
      setError(msg);
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
    setQuestions([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectAnswer = (label: string) => {
    if (answers[currentQ]) return;
    setAnswers((prev) => ({ ...prev, [currentQ]: label }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setShowExplanation(false);
    } else {
      setStep('results');
    }
  };

  const score = Object.entries(answers).filter(
    ([idx, ans]) => questions[Number(idx)]?.correct_answer === ans
  ).length;

  const readyToGenerate = text.trim().length >= 50;

  // Loading quiz from URL param
  if (loadingSetId) {
    return (
      <div className={styles.container}>
        <div className={styles.processingBox}>
          <Loader2 size={40} className={styles.spinner} />
          <h2 className={styles.processingTitle}>Loading Quiz</h2>
          <p className={styles.processingDesc}>Fetching your saved quiz from history...</p>
        </div>
      </div>
    );
  }

  // ── Results view ─────────────────────────────────────────────────────────────
  if (step === 'results') {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const isPassing = pct >= 70;
    return (
      <div className={styles.container}>
        <div className={styles.resultsCard}>
          <div className={`${styles.scoreCircle} ${isPassing ? styles.scorePass : styles.scoreFail}`}>
            <Trophy size={28} className={styles.trophyIcon} />
            <span className={styles.scorePct}>{pct}%</span>
            <span className={styles.scoreLabel}>{score} / {questions.length} correct</span>
          </div>
          <h2 className={styles.resultsTitle}>
            {pct === 100 ? 'Perfect Score!' : isPassing ? 'Good Job!' : 'Keep Practicing!'}
          </h2>
          <p className={styles.resultsSubtitle}>
            {pct === 100 ? 'You answered every question correctly.' :
              isPassing ? `You scored ${pct}%. You're doing great!` :
                `You scored ${pct}%. Review the explanations below and try again.`}
          </p>
          <div className={styles.resultsBtns}>
            <button
              onClick={() => { setCurrentQ(0); setAnswers({}); setShowExplanation(false); setStep('quiz'); }}
              className={styles.retakeBtn}
            >
              <RotateCcw size={16} /> Retake Quiz
            </button>
            <button onClick={resetInput} className={styles.newBtn}>New Quiz</button>
          </div>
        </div>

        <div className={styles.reviewSection}>
          <h3 className={styles.reviewTitle}>Review Answers</h3>
          <div className={styles.reviewList}>
            {questions.map((q, i) => {
              const userAns = answers[i];
              const isCorrect = userAns === q.correct_answer;
              return (
                <div key={i} className={`${styles.reviewItem} ${isCorrect ? styles.reviewCorrect : styles.reviewWrong}`}>
                  <div className={styles.reviewHeader}>
                    {isCorrect
                      ? <CheckCircle2 size={18} className={styles.iconCorrect} />
                      : <XCircle size={18} className={styles.iconWrong} />}
                    <span className={styles.reviewQ}>Q{i + 1}. {q.question}</span>
                  </div>
                  <div className={styles.reviewBody}>
                    <div className={styles.reviewAnswers}>
                      <span className={styles.reviewYours}>
                        Your answer: <strong>{userAns || 'Not answered'}</strong>
                      </span>
                      {!isCorrect && (
                        <span className={styles.reviewCorrectAns}>
                          Correct: <strong>{q.correct_answer}</strong>
                        </span>
                      )}
                    </div>
                    {q.explanation && (
                      <p className={styles.reviewExplanation}>{q.explanation}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz view ─────────────────────────────────────────────────────────────────
  if (step === 'quiz' && questions.length > 0) {
    const q = questions[currentQ];
    const userAnswer = answers[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;

    return (
      <div className={styles.container}>
        <div className={styles.quizTopBar}>
          <button onClick={resetInput} className={styles.quizBackBtn}>
            <ArrowLeft size={16} /> New Quiz
          </button>
          <div className={styles.quizMeta}>
            <span className={styles.qCounter}>Question {currentQ + 1} of {questions.length}</span>
            <span className={styles.qScore}>{score} correct</span>
          </div>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.questionCard}>
          <p className={styles.questionText}>{q.question}</p>

          <div className={styles.options}>
            {(q.options || []).map((opt) => {
              let cls = styles.option;
              if (userAnswer) {
                if (opt.label === q.correct_answer) cls += ` ${styles.optionCorrect}`;
                else if (opt.label === userAnswer && opt.label !== q.correct_answer) cls += ` ${styles.optionWrong}`;
                else cls += ` ${styles.optionDisabled}`;
              }
              return (
                <button
                  key={opt.label}
                  className={cls}
                  onClick={() => selectAnswer(opt.label)}
                  disabled={!!userAnswer}
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionText}>{opt.text}</span>
                  {userAnswer && opt.label === q.correct_answer && (
                    <CheckCircle2 size={16} className={styles.optionCheck} />
                  )}
                  {userAnswer && opt.label === userAnswer && opt.label !== q.correct_answer && (
                    <XCircle size={16} className={styles.optionX} />
                  )}
                </button>
              );
            })}
          </div>

          {showExplanation && q.explanation && (
            <div className={styles.explanation}>
              <AlertCircle size={16} className={styles.explanationIcon} />
              <p>{q.explanation}</p>
            </div>
          )}

          {userAnswer && (
            <button onClick={nextQuestion} className={styles.nextBtn}>
              {currentQ < questions.length - 1 ? 'Next Question →' : 'See Results →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Processing view ──────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className={styles.container}>
        <div className={styles.processingBox}>
          <div className={styles.processingSpinnerWrap}>
            <Loader2 size={36} className={styles.spinner} />
          </div>
          <h2 className={styles.processingTitle}>Generating Quiz</h2>
          <p className={styles.processingDesc}>
            AI is creating {count} {difficulty} questions&hellip;
          </p>
          <div className={styles.processingSteps}>
            <div className={styles.processingStep}>
              <div className={styles.stepDot} />
              <span>Analyzing your text</span>
            </div>
            <div className={styles.processingStep}>
              <div className={styles.stepDot} />
              <span>Generating questions</span>
            </div>
            <div className={styles.processingStep}>
              <div className={styles.stepDot} />
              <span>Validating answers</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Input view ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/study-tools" className={styles.backLink}>
          <ArrowLeft size={16} /> Study Tools
        </Link>
        <h1 className={styles.title}>Generate Quiz</h1>
        <p className={styles.subtitle}>Choose your source and AI will build a multiple-choice quiz.</p>
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
          placeholder="Paste your notes or lecture text here (min 50 characters)..."
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
                  if (f) {
                    setUploadFile(f);
                    setUploadedName(null);
                    setText('');
                    setAnalysisId(undefined);
                    handleUploadExtractFromFile(f);
                  }
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={36} className={`${styles.dropIcon} ${styles.spinSm}`} />
                    <p className={styles.dropLabel}>Extracting text…</p>
                    <p className={styles.dropHint}>Reading your document</p>
                  </>
                ) : (
                  <>
                    <FileText size={36} className={styles.dropIcon} />
                    <p className={styles.dropLabel}>
                      {uploadFile && !uploadedName ? uploadFile.name : 'Click or drag a file to upload'}
                    </p>
                    <p className={styles.dropHint}>PDF, DOCX, TXT, XLSX — text is extracted automatically</p>
                  </>
                )}
              </div>
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
              <p className={styles.historyHint}>Select a previously analyzed document:</p>
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
          <label className={styles.settingLabel}>Questions</label>
          <input type="range" min={3} max={25} value={count}
            onChange={(e) => setCount(Number(e.target.value))} className={styles.slider} />
          <span className={styles.settingValue}>{count}</span>
        </div>
        <div className={styles.settingGroup}>
          <label className={styles.settingLabel}>Difficulty</label>
          <div className={styles.difficultyBtns}>
            {['easy', 'medium', 'hard'].map((d) => (
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

      <button onClick={handleGenerate} disabled={!readyToGenerate || isUploading} className={styles.generateBtn}>
        {isUploading
          ? 'Extracting file…'
          : readyToGenerate
            ? `Generate ${count} Questions`
            : mode === 'paste' ? 'Enter at least 50 characters'
              : mode === 'upload' ? 'Drop a file above to get started'
                : 'Select a document from history'}
      </button>
    </div>
  );
}
