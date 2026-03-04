'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Brain, Lightbulb, ClipboardCheck } from 'lucide-react';
import styles from './AnalysisProgress.module.css';

const STAGES = [
  { icon: FileText, label: 'Extracting Text', duration: 15 },
  { icon: Brain, label: 'AI Analysis', duration: 40 },
  { icon: Lightbulb, label: 'Generating Insights', duration: 30 },
  { icon: ClipboardCheck, label: 'Compiling Report', duration: 15 },
];

interface AnalysisProgressProps {
  isProcessing: boolean;
}

export function AnalysisProgress({ isProcessing }: AnalysisProgressProps) {
  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setProgress(0);
      setActiveStage(0);
      return;
    }

    // Simulate progress that slows down as it approaches 95%
    let current = 0;
    const interval = setInterval(() => {
      const remaining = 95 - current;
      const increment = Math.max(0.3, remaining * 0.04);
      current = Math.min(95, current + increment);
      setProgress(current);

      // Determine active stage based on cumulative durations
      let cumulative = 0;
      for (let i = 0; i < STAGES.length; i++) {
        cumulative += STAGES[i].duration;
        if (current < cumulative) {
          setActiveStage(i);
          break;
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isProcessing]);

  // When processing completes, snap to 100%
  useEffect(() => {
    if (!isProcessing && progress > 0) {
      setProgress(100);
      setActiveStage(STAGES.length - 1);
    }
  }, [isProcessing, progress]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Analyzing Your Document</h2>
        <span className={styles.percentage}>{Math.round(progress)}%</span>
      </div>

      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.stages}>
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const state = i < activeStage ? 'done' : i === activeStage ? 'active' : 'pending';
          return (
            <div key={stage.label} className={`${styles.stage} ${styles[state]}`}>
              <div className={styles.stageIcon}>
                <Icon size={18} />
              </div>
              <span className={styles.stageLabel}>{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
