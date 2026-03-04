'use client';

import React, { useState } from 'react';
import {
  FileText, Hash, Lightbulb, HelpCircle, Download,
  BookOpen, ClipboardList, ChevronDown, ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { AnalysisResponse } from '@/types';
import { StatCard } from './StatCard';
import documentService from '@/services/document_service';
import styles from './AnalysisResults.module.css';

interface AnalysisResultsProps {
  result: AnalysisResponse;
  onReset: () => void;
  onGenerateFlashcards?: (text: string) => void;
  onGenerateQuiz?: (text: string) => void;
}

export function AnalysisResults({
  result,
  onReset,
  onGenerateFlashcards,
  onGenerateQuiz,
}: AnalysisResultsProps) {
  const { analysis, filename, word_count_info, export_files, extracted_text } = result;
  const wordCount = word_count_info?.original_word_count ?? word_count_info?.original ?? 0;

  return (
    <div className={styles.results}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analysis Complete</h1>
          <p className={styles.filename}>
            <FileText size={16} />
            {filename}
          </p>
        </div>
        <button onClick={onReset} className={styles.resetBtn}>
          <RotateCcw size={16} />
          Analyze Another
        </button>
      </div>

      {/* Stats row */}
      <div className={styles.stats}>
        <StatCard icon={FileText} label="Document" value={filename.split('.').pop()?.toUpperCase() || 'FILE'} color="#0084E8" />
        <StatCard icon={Hash} label="Words" value={wordCount.toLocaleString()} color="#0ea5e9" />
        <StatCard icon={Lightbulb} label="Insights" value={analysis.insights?.length || 0} color="#f59e0b" />
        <StatCard icon={HelpCircle} label="Q&A Pairs" value={analysis.questions_answers?.length || 0} color="#10b981" />
      </div>

      {/* Content cards */}
      <div className={styles.grid}>
        {/* Executive Summary */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <FileText size={20} className={styles.cardIcon} />
            <h2 className={styles.cardTitle}>Executive Summary</h2>
          </div>
          <p className={styles.summary}>{analysis.summary}</p>
        </section>

        {/* Key Insights */}
        {analysis.insights?.length > 0 && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <Lightbulb size={20} className={styles.cardIcon} />
              <h2 className={styles.cardTitle}>Key Insights</h2>
            </div>
            <ol className={styles.insightsList}>
              {analysis.insights.map((insight, i) => (
                <li key={i} className={styles.insightItem}>{insight}</li>
              ))}
            </ol>
          </section>
        )}

        {/* Questions & Answers */}
        {analysis.questions_answers?.length > 0 && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <HelpCircle size={20} className={styles.cardIcon} />
              <h2 className={styles.cardTitle}>Questions & Answers</h2>
            </div>
            <div className={styles.qaList}>
              {analysis.questions_answers.map((qa, i) => (
                <QAItem key={i} question={qa.question} answer={qa.answer} />
              ))}
            </div>
          </section>
        )}

        {/* Export Options */}
        {export_files && Object.keys(export_files).length > 0 && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <Download size={20} className={styles.cardIcon} />
              <h2 className={styles.cardTitle}>Export</h2>
            </div>
            <div className={styles.exportBtns}>
              {Object.entries(export_files).map(([format, fname]) => (
                <a
                  key={format}
                  href={documentService.getExportUrl(fname)}
                  className={styles.exportBtn}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={16} />
                  {format.toUpperCase()}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Study Actions */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <BookOpen size={20} className={styles.cardIcon} />
            <h2 className={styles.cardTitle}>Study Tools</h2>
          </div>
          <p className={styles.studyDesc}>Generate study materials from this analysis.</p>
          <div className={styles.studyBtns}>
            <button
              className={styles.studyBtn}
              onClick={() => onGenerateFlashcards?.(extracted_text || analysis.summary)}
            >
              <ClipboardList size={18} />
              Generate Flashcards
            </button>
            <button
              className={`${styles.studyBtn} ${styles.studyBtnAlt}`}
              onClick={() => onGenerateQuiz?.(extracted_text || analysis.summary)}
            >
              <HelpCircle size={18} />
              Generate Quiz
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Collapsible Q&A item ─────────────────────────────────────────────────── */
function QAItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.qaItem} ${open ? styles.qaOpen : ''}`}>
      <button className={styles.qaQuestion} onClick={() => setOpen((o) => !o)}>
        <span>{question}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className={styles.qaAnswer}>{answer}</div>}
    </div>
  );
}
