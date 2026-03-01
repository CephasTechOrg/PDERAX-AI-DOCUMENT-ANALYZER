/**
 * Dashboard Layout
 * Layout for authenticated pages (analyzer, study-tools, history, etc.)
 * Includes protected route wrapper
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated (after checking if loading)
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  // Only render dashboard if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar (Future) */}
      {/* <aside className={styles.sidebar}>
        {/* Navigation, project list, etc. */}
      {/* </aside> */}

      {/* Main Content */}
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
