'use client';

/**
 * OAuth Callback Page
 * Reads access_token + refresh_token from query params (set by backend after Google login),
 * saves the session to localStorage, then redirects to the dashboard.
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/services/api';
import authService from '@/services/auth';

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const access_token = searchParams.get('access_token');
    const refresh_token = searchParams.get('refresh_token');
    const expires_in = Number(searchParams.get('expires_in') || 1800);

    if (!access_token || !refresh_token) {
      setError('OAuth login failed — missing tokens. Please try again.');
      return;
    }

    // Set token on the API client so we can call /me
    apiClient.setToken(access_token);

    // Fetch user info then save complete session
    apiClient
      .get('/api/v1/auth/me')
      .then((user) => {
        const session = {
          access_token,
          refresh_token,
          expires_in,
          expires_at: Date.now() + expires_in * 1000,
          user,
        };
        localStorage.setItem('auth_session', JSON.stringify(session));
        router.replace('/analyzer');
      })
      .catch(() => {
        setError('Could not fetch your profile. Please log in manually.');
        setTimeout(() => router.replace('/login'), 3000);
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#991b1b' }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
      <p>Signing you in with Google…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem' }}>Loading…</div>}>
      <OAuthCallbackHandler />
    </Suspense>
  );
}
