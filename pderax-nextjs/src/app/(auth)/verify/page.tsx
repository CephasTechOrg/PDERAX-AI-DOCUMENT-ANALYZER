'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/services/api';
import styles from './page.module.css';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (emailRef.current && emailParam) {
      emailRef.current.value = emailParam;
    }
  }, [emailParam]);

  // Countdown for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const email = emailRef.current?.value?.trim() || '';
    const code = codeRef.current?.value?.trim() || '';

    if (!email || !code) {
      setError('Please enter your email and verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/api/v1/auth/verify', { email, code });
      setSuccess('Email verified! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Check your code and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setSuccess(null);
    const email = emailRef.current?.value?.trim() || '';
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post('/api/v1/auth/resend-code', { email });
      setSuccess('Verification code resent. Check your inbox.');
      setResendCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.verifyForm}>
      <div className={styles.header}>
        <div className={styles.icon}>✉️</div>
        <h1 className={styles.title}>Verify Your Email</h1>
        <p className={styles.subtitle}>
          Enter the 6-digit code we sent to your email address.
        </p>
      </div>

      {success && (
        <div className={styles.successAlert} role="status">
          {success}
        </div>
      )}
      {error && (
        <div className={styles.errorAlert} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email Address</label>
          <input
            id="email"
            ref={emailRef}
            type="email"
            defaultValue={emailParam}
            placeholder="you@example.com"
            className={styles.input}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="code" className={styles.label}>Verification Code</label>
          <input
            id="code"
            ref={codeRef}
            type="text"
            placeholder="123456"
            maxLength={6}
            className={`${styles.input} ${styles.codeInput}`}
            disabled={isLoading}
            required
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
          {isLoading ? 'Verifying…' : 'Verify Email'}
        </button>
      </form>

      <div className={styles.footer}>
        <span className={styles.footerText}>Didn&apos;t receive the code? </span>
        <button
          onClick={handleResend}
          disabled={isLoading || resendCooldown > 0}
          className={styles.resendBtn}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </div>

      <div className={styles.backLink}>
        <Link href="/login" className={styles.backLinkAnchor}>← Back to login</Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
