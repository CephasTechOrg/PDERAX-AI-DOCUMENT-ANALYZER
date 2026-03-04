/**
 * This file is intentionally unreachable in Next.js because src/app/page.tsx
 * takes precedence for the "/" route. The real dashboard is at /home.
 * Kept as a redirect safety net.
 */
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRoot() {
  const router = useRouter();
  useEffect(() => { router.replace('/home'); }, [router]);
  return null;
}
