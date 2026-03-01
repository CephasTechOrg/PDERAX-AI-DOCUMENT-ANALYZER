/**
 * Login Page
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { validateLoginForm } from '@/utils/validation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/analyzer');
    }
  }, [isAuthenticated, isLoading, router]);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    const validationErrors = validateLoginForm(email, password);
    if (validationErrors.length > 0) {
      const errorMap = validationErrors.reduce(
        (acc, error) => ({ ...acc, [error.field]: error.message }),
        {}
      );
      setErrors(errorMap);
      return;
    }

    try {
      await login(email, password);
      router.push('/analyzer');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed. Please try again.';
      setGeneralError(errorMessage);
    }
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  return (
    <div className={styles.loginForm}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your PDERAX account to continue</p>
      </div>

      <a href={`${API_BASE}/api/v1/auth/google/login`} className={styles.googleBtn}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </a>

      <div className={styles.divider}><span>or</span></div>

      {generalError && (
        <div className={styles.errorAlert} role="alert">{generalError}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          ref={emailRef}
          type="email"
          label="Email Address"
          placeholder="you@example.com"
          disabled={isLoading}
          error={errors.email}
          required
        />
        <div>
          <Input
            ref={passwordRef}
            type="password"
            label="Password"
            placeholder="Enter your password"
            disabled={isLoading}
            error={errors.password}
            required
          />
          <div className={styles.forgotRow}>
            <Link href="#forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" fullWidth isLoading={isLoading} disabled={isLoading}>
          {isLoading ? 'Signing In…' : 'Sign In'}
        </Button>
      </form>

      <div className={styles.links}>
        <span className={styles.linkText}>Don&apos;t have an account?{' '}</span>
        <Link href="/signup" className={styles.link}>Sign up</Link>
      </div>
    </div>
  );
}
