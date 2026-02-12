'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type JwtPayload = {
  role?: 'admin' | 'candidate' | 'employer' | string;
};

const readRoleFromToken = (): string | null => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(atob(parts[1])) as JwtPayload;
    return payload.role || null;
  } catch {
    return null;
  }
};

export default function DashboardLandingPage() {
  const router = useRouter();

  useEffect(() => {
    const role = readRoleFromToken();

    if (!role) {
      router.replace('/auth/login');
      return;
    }

    if (role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }

    if (role === 'employer') {
      router.replace('/employer/dashboard');
      return;
    }

    router.replace('/candidate/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-600">Opening your dashboard...</p>
      </div>
    </div>
  );
}
