'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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

const isPublicRoute = (pathname: string): boolean => {
  const exactPublic = ['/', '/jobs', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
  if (exactPublic.includes(pathname)) return true;
  if (pathname.startsWith('/jobs/')) return true;
  return false;
};

const getRequiredRole = (pathname: string): AppRole | 'authenticated' | null => {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/employer')) return 'employer';
  if (pathname.startsWith('/candidate')) return 'candidate';
  if (pathname === '/dashboard') return 'authenticated';
  return null;
};

export default function RouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || localStorage.getItem('token')
      : null;
  const role = useMemo(() => parseRole(token), [token]);

  useEffect(() => {
    if (!pathname) return;

    if (isPublicRoute(pathname)) {
      setReady(true);
      return;
    }

    const required = getRequiredRole(pathname);
    if (!required) {
      setReady(true);
      return;
    }

    if (!token) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (required === 'authenticated') {
      setReady(true);
      return;
    }

    const allowed =
      role === required || (required === 'employer' && role === 'admin');

    if (!allowed) {
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (role === 'employer') {
        router.replace('/employer/jobs');
      } else if (role === 'candidate') {
        router.replace('/candidate/profile');
      } else {
        router.replace('/auth/login');
      }
      return;
    }

    setReady(true);
  }, [pathname, role, router, token]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600">Checking access...</div>
      </div>
    );
  }

  return null;
}
