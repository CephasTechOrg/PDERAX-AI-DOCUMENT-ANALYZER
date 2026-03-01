/**
 * Login Page
 * User login form with email and password
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

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard/analyzer');
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

    // Validate form
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
      // Redirect to dashboard on success
      router.push('/dashboard/analyzer');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed. Please try again.';
      setGeneralError(errorMessage);
    }
  };

  return (
    <div className={styles.loginForm}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>
          Sign in to your PDERAX account to continue
        </p>
      </div>

      {/* Error Message */}
      {generalError && (
        <div className={styles.errorAlert} role="alert">
          {generalError}
        </div>
      )}

      {/* Form */}
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

        <Input
          ref={passwordRef}
          type="password"
          label="Password"
          placeholder="Enter your password"
          disabled={isLoading}
          error={errors.password}
          required
        />

        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      {/* Divider */}
      <div className={styles.divider}>
        <span>or</span>
      </div>

      {/* Links */}
      <div className={styles.links}>
        <div>
          <span className={styles.linkText}>Don't have an account? </span>
          <Link href="/signup" className={styles.link}>
            Sign up
          </Link>
        </div>
        <Link href="#forgot-password" className={styles.forgotLink}>
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
