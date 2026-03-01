/**
 * Signup Page
 * User registration form with name, email, password, and terms acceptance
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { validateSignupForm, getPasswordStrength } from '@/utils/validation';
import styles from './page.module.css';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, isAuthenticated } = useAuth();

  // Redirect if already logged in
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strength = getPasswordStrength(e.target.value);
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const name = nameRef.current?.value || '';
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    const passwordConfirm = passwordConfirmRef.current?.value || '';
    const acceptedTerms = termsRef.current?.checked || false;

    // Validate form
    const validationErrors = validateSignupForm(
      name,
      email,
      password,
      passwordConfirm,
      acceptedTerms
    );
    if (validationErrors.length > 0) {
      const errorMap = validationErrors.reduce(
        (acc, error) => ({ ...acc, [error.field]: error.message }),
        {}
      );
      setErrors(errorMap);
      return;
    }

    try {
      await signup(name, email, password, passwordConfirm);
      // Redirect to dashboard on success
      router.push('/dashboard/analyzer');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Signup failed. Please try again.';
      setGeneralError(errorMessage);
    }
  };

  return (
    <div className={styles.signupForm}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>
          Join PDERAX to start analyzing documents with AI
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
        {/* Name Field */}
        <Input
          ref={nameRef}
          type="text"
          label="Full Name"
          placeholder="John Doe"
          disabled={isLoading}
          error={errors.name}
          required
        />

        {/* Email Field */}
        <Input
          ref={emailRef}
          type="email"
          label="Email Address"
          placeholder="you@example.com"
          disabled={isLoading}
          error={errors.email}
          required
        />

        {/* Password Field */}
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
          {passwordRef.current?.value && (
            <div className={styles.strengthIndicator}>
              <span className={styles.strengthLabel}>Strength:</span>
              <div className={styles.strengthBars}>
                <div
                  className={`${styles.strengthBar} ${styles[`strength-${passwordStrength}`]}`}
                />
              </div>
              <span className={styles.strengthText}>{passwordStrength}</span>
            </div>
          )}
        </div>

        {/* Password Confirmation Field */}
        <Input
          ref={passwordConfirmRef}
          type="password"
          label="Confirm Password"
          placeholder="Confirm your password"
          disabled={isLoading}
          error={errors.password_confirm}
          required
        />

        {/* Terms Checkbox */}
        <div className={styles.termsGroup}>
          <label className={styles.termsLabel}>
            <input
              ref={termsRef}
              type="checkbox"
              disabled={isLoading}
              required
            />
            <span>
              I agree to the{' '}
              <Link href="#terms" className={styles.termsLink}>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="#privacy" className={styles.termsLink}>
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.terms && (
            <span className={styles.termsError}>{errors.terms}</span>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      {/* Links */}
      <div className={styles.loginLink}>
        <span className={styles.linkText}>Already have an account? </span>
        <Link href="/login" className={styles.link}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
