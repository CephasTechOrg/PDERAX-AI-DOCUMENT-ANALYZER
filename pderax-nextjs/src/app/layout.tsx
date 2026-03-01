/**
 * Root Layout
 * Main layout wrapper for the entire application
 */

import type { Metadata } from 'next';
import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'PDERAX - AI Document Analyzer',
  description:
    'Transform your documents with AI-powered analysis, automatic flashcard generation, and intelligent study tools.',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navigation />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
