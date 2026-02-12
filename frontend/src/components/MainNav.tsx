'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

type UserRole = 'admin' | 'employer' | 'candidate' | null;

const parseRoleFromToken = (token: string | null): UserRole => {
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

export default function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const storeAccessToken = useAuthStore((state) => state.accessToken);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAuthPage = pathname.startsWith('/auth');

  const accessToken =
    storeAccessToken ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || localStorage.getItem('token')
      : null);
  const role = parseRoleFromToken(accessToken);
  const isAuthenticated = Boolean(accessToken);

  const roleLinks = useMemo(() => {
    if (role === 'admin') {
      return [
        { href: '/admin/dashboard', label: 'Admin Dashboard' },
        { href: '/admin/jobs', label: 'Review Jobs' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/companies', label: 'Companies' },
        { href: '/admin/activity-logs', label: 'Activity Logs' },
        { href: '/admin/reports', label: 'Reports' },
      ];
    }

    if (role === 'employer') {
      return [
        { href: '/employer/dashboard', label: 'Employer Dashboard' },
        { href: '/employer/post-job', label: 'Post Job' },
        { href: '/employer/jobs', label: 'Manage Jobs' },
        { href: '/employer/analytics', label: 'Analytics' },
      ];
    }

    if (role === 'candidate') {
      return [
        { href: '/candidate/dashboard', label: 'Candidate Dashboard' },
        { href: '/jobs', label: 'Find Jobs' },
        { href: '/jobs/saved', label: 'Saved Jobs' },
        { href: '/candidate/applications', label: 'Applications' },
      ];
    }

    return [
      { href: '/jobs', label: 'Jobs' },
      { href: '/auth/register', label: 'Register' },
    ];
  }, [role]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await authService.logout();
    } catch {
      // Ignore backend logout errors and clear local session anyway.
    } finally {
      clearAuth();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
      router.push('/auth/login');
      router.refresh();
      setLoggingOut(false);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Job Portal
          </Link>
          {!isAuthPage && (
            <nav className="flex flex-wrap items-center gap-2">
              {roleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-2 py-1 text-sm ${
                    pathname === link.href
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
