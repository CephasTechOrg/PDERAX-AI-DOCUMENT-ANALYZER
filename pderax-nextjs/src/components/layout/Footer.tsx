/**
 * Footer Component
 * Professional footer with links, social media, and copyright
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Footer.module.css';

const PUBLIC_PATHS = ['/'];

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  // Hidden on dashboard/app pages
  if (!PUBLIC_PATHS.includes(pathname)) return null;

  return (
    <footer className={styles.footer} data-root-footer>
      <div className={styles.footerContainer}>
        {/* Brand Section */}
        <div className={styles.footerSection}>
          <div className={styles.brand}>
            <div className={styles.brandName}>PDERAX</div>
            <p className={styles.tagline}>
              AI-powered document analysis for students and educators
            </p>
          </div>
        </div>

        {/* Links Sections */}
        <div className={styles.footerSection}>
          <h4 className={styles.sectionTitle}>Product</h4>
          <ul className={styles.linkList}>
            <li>
              <Link href="#features">Features</Link>
            </li>
            <li>
              <Link href="#how-it-works">How It Works</Link>
            </li>
            <li>
              <Link href="/pricing">Pricing</Link>
            </li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.sectionTitle}>Resources</h4>
          <ul className={styles.linkList}>
            <li>
              <Link href="/documentation">Documentation</Link>
            </li>
            <li>
              <Link href="/features">Features</Link>
            </li>
            <li>
              <Link href="#blog">Blog</Link>
            </li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.sectionTitle}>Legal</h4>
          <ul className={styles.linkList}>
            <li>
              <Link href="#privacy">Privacy Policy</Link>
            </li>
            <li>
              <Link href="#terms">Terms of Service</Link>
            </li>
            <li>
              <Link href="#contact">Contact</Link>
            </li>
          </ul>
        </div>

        {/* Social Media */}
        <div className={styles.footerSection}>
          <h4 className={styles.sectionTitle}>Follow Us</h4>
          <div className={styles.socialLinks}>
            <a href="#twitter" aria-label="Twitter" className={styles.socialLink}>
              Twitter
            </a>
            <a href="#linkedin" aria-label="LinkedIn" className={styles.socialLink}>
              LinkedIn
            </a>
            <a href="#github" aria-label="GitHub" className={styles.socialLink}>
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className={styles.copyright}>
        <p>
          &copy; {currentYear} PDERAX. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
