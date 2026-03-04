'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  FileSearch, BookOpen, MessageSquare, Clock,
  GraduationCap, BarChart3, LogOut, X, Zap, LayoutDashboard,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/home', icon: LayoutDashboard, color: '#0066B4' },
  { label: 'Analyzer', href: '/analyzer', icon: FileSearch, color: '#0084E8' },
  { label: 'Study Tools', href: '/study-tools', icon: BookOpen, color: '#2A9D8F' },
  { label: 'AI Assistant', href: '/ai-assistant', icon: MessageSquare, color: '#3B9CE8' },
  { label: 'History', href: '/history', icon: Clock, color: '#3F657B' },
  { label: 'Classrooms', href: '/classrooms', icon: GraduationCap, color: '#16a34a' },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, color: '#E88C30' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Lock body scroll when sidebar overlay is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>

        {/* Logo */}
        <Link href="/" className={styles.logo} onClick={onClose}>
          <div className={styles.logoIcon}>
            <Zap size={16} fill="currentColor" />
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoPrimary}>PDERAX</span>
            <span className={styles.logoSub}>AI Study Platform</span>
          </div>
        </Link>

        <p className={styles.navLabel}>Menu</p>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navActive : ''}`}
                onClick={onClose}
              >
                <span
                  className={styles.navIcon}
                  style={active ? { background: `${item.color}1a`, color: item.color } : {}}
                >
                  <Icon size={17} />
                </span>
                <span className={styles.navLabel2}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className={styles.userSection}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userRole}>
                {user?.role === 'teacher' ? 'Teacher' : 'Student'}
              </span>
            </div>
            <button
              className={styles.logoutBtn}
              onClick={() => { logout(); onClose(); }}
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
