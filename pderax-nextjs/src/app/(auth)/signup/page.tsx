/**
 * Signup Page - Two-step: register then verify email inline
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/api';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { validateSignupForm, getPasswordStrength } from '@/utils/validation';
import styles from './page.module.css';

type Step = 'register' | 'verify';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard/analyzer');
    }
  }, [isAuthenticated, isLoading, router]);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('register');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPasswordValue(val);
    setPasswordStrength(getPasswordStrength(val));
  };

  const strengthMap = {
    weak:   { color: '#ef4444', width: '33%' },
    medium: { color: '#f59e0b', width: '66%' },
    strong: { color: '#10b981', width: '100%' },
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const name = nameRef.current?.value || '';
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    const passwordConfirm = passwordConfirmRef.current?.value || '';
    const acceptedTerms = termsRef.current?.checked || false;

    const validationErrors = validateSignupForm(name, email, password, passwordConfirm, acceptedTerms);
    if (validationErrors.length > 0) {
      const errorMap = validationErrors.reduce(
        (acc, err) => ({ ...acc, [err.field]: err.message }),
        {} as Record<string, string>
      );
      setErrors(errorMap);
      return;
    }

    try {
      await signup(email, name, password, passwordConfirm);
      setRegisteredEmail(email);
      setStep('verify');
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Signup failed. Please try again.'
      );
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setVerifySuccess(null);

    const code = codeRef.current?.value?.trim() || '';
    if (!code) {
      setVerifyError('Please enter the 6-digit code from your email.');
      return;
    }

    setIsVerifying(true);
    try {
      await apiClient.post('/api/v1/auth/verify', { email: registeredEmail, code });
      setVerifySuccess('Email verified! Redirecting to login…');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      setVerifyError(
        err instanceof Error ? err.message : 'Invalid code. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setVerifyError(null);
    setVerifySuccess(null);
    setIsVerifying(true);
    try {
      await apiClient.post('/api/v1/auth/resend-code', { email: registeredEmail });
      setVerifySuccess('Code resent! Check your inbox.');
      setResendCooldown(60);
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : 'Failed to resend code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // ── Verify step ─────────────────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className={styles.signupForm}>
        <div className={styles.header}>
          <div className={styles.stepIcon}>✉️</div>
          <h1 className={styles.title}>Check Your Email</h1>
          <p className={styles.subtitle}>
            We sent a 6-digit code to{' '}
            <strong style={{ color: '#1f2937' }}>{registeredEmail}</strong>.
            <br />Enter it below to activate your account.
          </p>
        </div>

        {verifySuccess && (
          <div className={styles.successAlert} role="status">{verifySuccess}</div>
        )}
        {verifyError && (
          <div className={styles.errorAlert} role="alert">{verifyError}</div>
        )}

        <form onSubmit={handleVerify} className={styles.form}>
          <div className={styles.codeField}>
            <label htmlFor="verify-code" className={styles.codeLabel}>
              Verification Code
            </label>
            <input
              id="verify-code"
              ref={codeRef}
              type="text"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              className={styles.codeInput}
              disabled={isVerifying}
              autoFocus
              required
            />
          </div>

          <Button type="submit" fullWidth isLoading={isVerifying} disabled={isVerifying}>
            {isVerifying ? 'Verifying…' : 'Verify Email'}
          </Button>
        </form>

        <div className={styles.resendArea}>
          <span className={styles.linkText}>Didn&apos;t get the code?{' '}</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={isVerifying || resendCooldown > 0}
            className={styles.resendBtn}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>

        <div className={styles.loginLink}>
          <button type="button" onClick={() => setStep('register')} className={styles.backBtn}>
            ← Back to sign up
          </button>
        </div>
      </div>
    );
  }

  // ── Register step ────────────────────────────────────────────────────────────
  return (
    <div className={styles.signupForm}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>
          Join PDERAX to start analyzing documents with AI
        </p>
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

      <form onSubmit={handleSignup} className={styles.form}>
        <Input
          ref={nameRef}
          type="text"
          label="Full Name"
          placeholder="John Doe"
          disabled={isLoading}
          error={errors.name}
          required
        />
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
            placeholder="Create a strong password"
            disabled={isLoading}
            error={errors.password}
            onChange={handlePasswordChange}
            required
          />
          {passwordValue && (
            <div className={styles.strengthIndicator}>
              <div className={styles.strengthBar}>
                <div
                  className={styles.strengthFill}
                  style={{
                    width: strengthMap[passwordStrength].width,
                    backgroundColor: strengthMap[passwordStrength].color,
                  }}
                />
              </div>
              <span
                className={styles.strengthText}
                style={{ color: strengthMap[passwordStrength].color }}
              >
                {passwordStrength}
              </span>
            </div>
          )}
        </div>
        <Input
          ref={passwordConfirmRef}
          type="password"
          label="Confirm Password"
          placeholder="Confirm your password"
          disabled={isLoading}
          error={errors.password_confirm}
          required
        />
        <div className={styles.termsGroup}>
          <label className={styles.termsLabel}>
            <input ref={termsRef} type="checkbox" disabled={isLoading} required />
            <span>
              I agree to the{' '}
              <Link href="#terms" className={styles.termsLink}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="#privacy" className={styles.termsLink}>Privacy Policy</Link>
            </span>
          </label>
          {errors.terms && <span className={styles.termsError}>{errors.terms}</span>}
        </div>
        <Button type="submit" fullWidth isLoading={isLoading} disabled={isLoading}>
          {isLoading ? 'Creating Account…' : 'Create Account'}
        </Button>
      </form>

      <div className={styles.loginLink}>
        <span className={styles.linkText}>Already have an account?{' '}</span>
        <Link href="/login" className={styles.link}>Sign in</Link>
      </div>
    </div>
  );
}
