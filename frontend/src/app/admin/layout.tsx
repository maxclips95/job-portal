'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/jobs', label: 'Jobs' },
  { href: '/admin/companies', label: 'Companies' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/activity-logs', label: 'Activity Logs' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
      router.push('/auth/login');
      router.refresh();
    }
  };

  return (
    <div className="bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Admin Control Panel</h2>
          <p className="text-xs text-gray-500">Moderation, operations, and platform controls</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Logout
        </button>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-2">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                pathname === link.href
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
