/**
 * Form Validation Utilities
 * Validation functions for common form fields
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  return null;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return 'Password must contain uppercase, lowercase, and numbers';
  }

  return null;
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(
  password: string,
  confirmation: string
): string | null {
  if (!confirmation) {
    return 'Please confirm your password';
  }

  if (password !== confirmation) {
    return 'Passwords do not match';
  }

  return null;
}

/**
 * Validate name
 */
export function validateName(name: string): string | null {
  if (!name) {
    return 'Name is required';
  }

  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters long';
  }

  if (name.length > 100) {
    return 'Name must not exceed 100 characters';
  }

  return null;
}

/**
 * Get password strength indicator
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (!password) return 'weak';

  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 1) return 'weak';
  if (strength <= 3) return 'medium';
  return 'strong';
}

/**
 * Validate login form
 */
export function validateLoginForm(email: string, password: string): ValidationError[] {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
}

/**
 * Validate signup form
 */
export function validateSignupForm(
  name: string,
  email: string,
  password: string,
  passwordConfirm: string,
  acceptedTerms: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];

  const nameError = validateName(name);
  if (nameError) {
    errors.push({ field: 'name', message: nameError });
  }

  const emailError = validateEmail(email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.push({ field: 'password', message: passwordError });
  }

  const passwordConfirmError = validatePasswordConfirmation(password, passwordConfirm);
  if (passwordConfirmError) {
    errors.push({ field: 'password_confirm', message: passwordConfirmError });
  }

  if (!acceptedTerms) {
    errors.push({
      field: 'terms',
      message: 'You must accept the terms and conditions',
    });
  }

  return errors;
}
