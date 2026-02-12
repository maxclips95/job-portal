'use client';

import Link from 'next/link';

export default function Home() {
  const quickLinks = [
    { href: '/jobs', title: 'Browse Jobs', subtitle: 'Search and filter open roles' },
    { href: '/auth/register', title: 'Create Account', subtitle: 'Candidate and employer onboarding' },
    { href: '/candidate/applications', title: 'My Applications', subtitle: 'Track application pipeline' },
    { href: '/employer/post-job', title: 'Post a Job', subtitle: 'Create and publish vacancies' },
    { href: '/screening', title: 'AI Screening', subtitle: 'Bulk resume screening workflow' },
    { href: '/admin/dashboard', title: 'Admin Panel', subtitle: 'Platform operations and analytics' },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Job Portal</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight">Recruitment Platform with Candidate, Employer, and Admin Workflows</h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600">
            Access jobs, candidate applications, employer tools, AI screening, and admin operations from one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/jobs" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Explore Jobs
            </Link>
            <Link href="/auth/login" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100">
              Candidate Login
            </Link>
            <Link href="/auth/login?role=employer" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100">
              Employer Login
            </Link>
            <Link href="/auth/login?role=admin" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100">
              Admin Login
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow"
            >
              <h2 className="text-lg font-semibold">{link.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{link.subtitle}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
