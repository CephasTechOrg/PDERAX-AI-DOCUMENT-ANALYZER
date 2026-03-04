'use client';

import React from 'react';
import Link from 'next/link';
import { ClipboardList, HelpCircle, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import styles from './page.module.css';

const TOOLS = [
  {
    title: 'Flashcards',
    description: 'AI generates a flip-card deck from your notes or documents. Perfect for spaced repetition and memorisation.',
    icon: ClipboardList,
    href: '/study-tools/flashcards',
    color: '#0066B4',
    bg: '#E6F0FA',
    badge: 'Most popular',
  },
  {
    title: 'Quiz',
    description: 'Get instant multiple-choice quizzes with explanations. Track your score and review every answer.',
    icon: HelpCircle,
    href: '/study-tools/quiz',
    color: '#d97706',
    bg: '#fffbeb',
    badge: null,
  },
  {
    title: 'AI Tutor',
    description: 'Chat with an AI that adapts to your learning style — Socratic mode for guided thinking or direct answers.',
    icon: MessageSquare,
    href: '/ai-assistant',
    color: '#0ea5e9',
    bg: '#f0f9ff',
    badge: 'AI Powered',
  },
];

export default function StudyToolsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerBadge}>
          <Sparkles size={13} /> Study Tools
        </div>
        <h1 className={styles.title}>What would you like to study?</h1>
        <p className={styles.subtitle}>
          Transform any document or text into interactive study materials.
        </p>
      </div>

      <div className={styles.grid}>
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.title} href={tool.href} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardIcon} style={{ backgroundColor: tool.bg, color: tool.color }}>
                  <Icon size={26} />
                </div>
                {tool.badge && (
                  <span className={styles.badge} style={{ color: tool.color, background: tool.bg }}>
                    {tool.badge}
                  </span>
                )}
              </div>
              <h2 className={styles.cardTitle}>{tool.title}</h2>
              <p className={styles.cardDesc}>{tool.description}</p>
              <span className={styles.cardAction} style={{ color: tool.color }}>
                Get started <ArrowRight size={14} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className={styles.tip}>
        <Sparkles size={14} className={styles.tipIcon} />
        <p className={styles.tipText}>
          <strong>Tip:</strong> Analyze a document in the Analyzer first, then jump straight to Study Tools with your text pre-filled.
        </p>
      </div>
    </div>
  );
}
