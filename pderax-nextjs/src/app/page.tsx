/**
 * Landing Page
 * Home page with hero section, features, and call-to-action
 */

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>✨ AI-Powered Document Analysis</div>
          <h1 className={styles.title}>
            Transform Your Documents into Learning Tools
          </h1>
          <p className={styles.subtitle}>
            Automatically generate flashcards, summaries, and study guides from any document
            using advanced AI. Save hours on content creation and focus on what matters most.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/signup" className={`${styles.button} ${styles.primaryButton}`}>
              Get Started Free
            </Link>
            <a href="#features" className={`${styles.button} ${styles.secondaryButton}`}>
              Learn More →
            </a>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.placeholderImage}>
            <div className={styles.imagePlaceholder}>Document Preview</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Powerful Features</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need to analyze documents and create study materials
          </p>

          <div className={styles.featureGrid}>
            {[
              {
                icon: '📄',
                title: 'Smart Document Analysis',
                description: 'Upload any document and get instant AI-powered analysis and summaries',
              },
              {
                icon: '🎓',
                title: 'Auto-Generated Flashcards',
                description: 'Create comprehensive flashcard decks automatically in seconds',
              },
              {
                icon: '📊',
                title: 'Study Progress Tracking',
                description: 'Monitor your learning progress with detailed analytics',
              },
              {
                icon: '🤖',
                title: 'AI Chat Assistant',
                description: 'Ask questions about your documents and get instant answers',
              },
              {
                icon: '📱',
                title: 'Multi-Format Support',
                description: 'Works with PDF, Word documents, and text files',
              },
              {
                icon: '☁️',
                title: 'Cloud Storage',
                description: 'Access your documents anytime, anywhere, on any device',
              },
            ].map((feature, idx) => (
              <div key={idx} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
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
