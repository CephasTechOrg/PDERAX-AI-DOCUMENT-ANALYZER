/**
 * Input Component
 * Reusable text input field with label and error handling
 */

'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className={styles.inputGroup}>
        {label && (
          <label htmlFor={props.id || props.name} className={styles.label}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${styles.input} ${error ? styles.errorInput : ''} ${className || ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
        {error && (
          <span id={`${props.id}-error`} className={styles.error}>
            {error}
          </span>
        )}
        {helperText && !error && (
          <span className={styles.helperText}>{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
