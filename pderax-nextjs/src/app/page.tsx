/**
 * Landing Page
 * Public-facing home. If the user is already logged in, redirect to /home.
 */

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't flash the landing page while auth initializes or during redirect
  if (isLoading || isAuthenticated) return null;

  return (
    <>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeIcon}>✨</span>
            AI-Powered Learning
          </div>
          <h1 className={styles.title}>
            Study Smarter,<br />
            <span className={styles.gradientText}>Not Harder</span>
          </h1>
          <p className={styles.subtitle}>
            Upload your notes, PDFs, or documents. Get AI-generated flashcards, 
            quizzes, and summaries in seconds. Your personal study assistant.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/signup" className={`${styles.button} ${styles.primaryButton}`}>
              <span>Start Free</span>
              <span className={styles.buttonArrow}>→</span>
            </Link>
            <Link href="/login" className={`${styles.button} ${styles.secondaryButton}`}>
              <span className={styles.playIcon}>▶</span>
              <span>Try Now</span>
            </Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>10K+</span>
              <span className={styles.statLabel}>Documents</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>50K+</span>
              <span className={styles.statLabel}>Flashcards</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>99%</span>
              <span className={styles.statLabel}>Accuracy</span>
            </div>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroImageContainer}>
            <Image 
              src="/assets/student.png" 
              alt="Student studying with PDERAX" 
              className={styles.heroImage}
              width={500}
              height={500}
              priority
            />
            <div className={styles.heroImageGlow}></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Features</span>
            <h2 className={styles.sectionTitle}>Everything You Need to Excel</h2>
            <p className={styles.sectionSubtitle}>
              Powerful AI tools designed for modern students
            </p>
          </div>

          <div className={styles.featureGrid}>
            {[
              {
                icon: '📄',
                title: 'Document Analysis',
                description: 'Upload PDFs, Word docs, or notes. AI extracts key concepts, generates summaries, and identifies important topics.',
                items: ['PDF, DOCX, TXT support', 'Auto summaries', 'Key insights extraction']
              },
              {
                icon: '📚',
                title: 'AI Flashcards',
                description: 'Generate study flashcards instantly from your documents. Choose difficulty and customize your learning experience.',
                items: ['Auto-generated cards', 'Flip to reveal', 'Easy/Medium/Hard levels']
              },
              {
                icon: '❓',
                title: 'Quiz Generator',
                description: 'Test your knowledge with AI-generated quizzes. Get instant feedback with detailed explanations for every answer.',
                items: ['Multiple choice', 'Instant results', 'Answer explanations']
              },
              {
                icon: '🤖',
                title: 'AI Tutor',
                description: 'Chat with an AI that understands your documents. Ask questions, get explanations, and learn through conversation.',
                items: ['Teacher mode', 'Helper mode', 'Context-aware']
              },
            ].map((feature, idx) => (
              <div key={idx} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
                <ul className={styles.featureList}>
                  {feature.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <span className={styles.checkIcon}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>
            Get started in three simple steps
          </p>

          <div className={styles.stepsGrid}>
            {[
              {
                step: '1',
                title: 'Upload Document',
                description: 'Drop your document or paste text to begin analysis',
              },
              {
                step: '2',
                title: 'AI Analysis',
                description: 'Our AI automatically extracts key concepts and generates content',
              },
              {
                step: '3',
                title: 'Study & Learn',
                description: 'Use generated flashcards and materials to study effectively',
              },
            ].map((item, idx) => (
              <div key={idx} className={styles.stepCard}>
                <div className={styles.stepNumber}>{item.step}</div>
                <h3 className={styles.stepTitle}>{item.title}</h3>
                <p className={styles.stepDescription}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>Ready to Transform Your Learning?</h2>
          <p className={styles.ctaSubtitle}>
            Join thousands of students and teachers using PDERAX
          </p>
          <Link href="/signup" className={`${styles.button} ${styles.ctaButton}`}>
            Start Free Today
          </Link>
        </div>
      </section>
    </>
  );
}
