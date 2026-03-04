/**
 * Navigation Component
 * Responsive header with navigation links and user menu
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Navigation.module.css';

/** Routes where the root nav should be visible (landing page only) */
const PUBLIC_PATHS = ['/'];

interface NavLink {
  label: string;
  href: string;
  requiresAuth?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
];

const AUTH_NAV_LINKS: NavLink[] = [
  { label: 'Analyzer', href: '/analyzer' },
  { label: 'AI Assistant', href: '/ai-assistant' },
  { label: 'History', href: '/history' },
];

export function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hide root nav on all dashboard/app pages — only show on public routes
  if (!PUBLIC_PATHS.includes(pathname)) return null;

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLinks = isAuthenticated ? AUTH_NAV_LINKS : NAV_LINKS;

  return (
    <nav className={styles.nav} data-root-nav>
      <div className={styles.navContainer}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <Image 
            src="/assets/logo.png" 
            alt="PDERAX Logo"
            width={32}
            height={32}
            className={styles.logoImage}
          />
          <span className={styles.logoText}>PDERAX</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className={styles.navLinks}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.navLink}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop User Menu / Auth Buttons */}
        <div className={styles.navRight}>
          {isAuthenticated ? (
            <>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.full_name || user?.email.split('@')[0] || 'User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className={`${styles.button} ${styles.outlineButton}`}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`${styles.button} ${styles.outlineButton}`}>
                Login
              </Link>
              <Link href="/signup" className={`${styles.button} ${styles.primaryButton}`}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`${styles.mobileMenuButton} ${isMobileMenuOpen ? styles.active : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileMenuLink}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <div className={styles.mobileMenuUser}>
                <span>{user?.full_name || user?.email.split('@')[0] || 'User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className={styles.mobileMenuButton}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={styles.mobileMenuLink}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className={styles.mobileMenuLink}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
