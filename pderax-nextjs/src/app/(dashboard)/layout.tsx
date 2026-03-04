/**
 * Dashboard Layout
 * Authenticated pages get a sidebar + main content area.
 * The root Navigation bar is hidden via CSS class on body.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Menu } from 'lucide-react';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Add class to body to hide root nav + footer on dashboard pages
  useEffect(() => {
    document.body.classList.add('dashboard-active');
    return () => {
      document.body.classList.remove('dashboard-active');
    };
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.mainWrapper}>
        {/* Mobile top bar with hamburger */}
        <header className={styles.mobileHeader}>
          <button
            className={styles.hamburger}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className={styles.mobileTitle}>PDERAX</span>
        </header>

        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
