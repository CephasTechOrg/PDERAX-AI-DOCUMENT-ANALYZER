/**
 * Authentication Layout
 * Layout for login and signup pages
 */

import React from 'react';
import styles from './layout.module.css';

export const metadata = {
  title: 'Authentication - PDERAX',
  description: 'Login or sign up to PDERAX',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        {children}
      </div>
    </div>
  );
}
