'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type AppRole = 'admin' | 'employer' | 'candidate' | null;

const parseRole = (token: string | null): AppRole => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    const role = payload?.role;
    if (role === 'admin' || role === 'employer' || role === 'candidate') {
      return role;
    }
    return null;
  } catch {
    return null;
  }
};

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || localStorage.getItem('token')
        : null;

    if (!token) {
      router.replace('/auth/login?next=/dashboard');
      return;
    }

    const role = parseRole(token);
    if (role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }
    if (role === 'employer') {
      router.replace('/employer/jobs');
      return;
    }
    router.replace('/candidate/applications');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        Redirecting to your dashboard...
      </div>
    </div>
  );
}
