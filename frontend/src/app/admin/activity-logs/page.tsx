'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertCircle, ChevronLeft, ChevronRight, Loader, RefreshCcw, Search } from 'lucide-react';

type ActivityLog = {
  id: string;
  adminId: string | null;
  adminName: string;
  adminEmail: string | null;
  action: string;
  description: string;
  targetId: string | null;
  targetType: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (nextPage = page) => {
    try {
      setLoading(true);
      setError('');
      const offset = (nextPage - 1) * PAGE_SIZE;
      const response = await axios.get('/api/admin/activity-logs', {
        params: { limit: PAGE_SIZE, offset },
        withCredentials: true,
      });
      setLogs(response.data?.logs || []);
      setTotal(Number(response.data?.total || 0));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) => {
      return (
        log.action.toLowerCase().includes(term) ||
        log.description.toLowerCase().includes(term) ||
        (log.adminName || '').toLowerCase().includes(term) ||
        (log.adminEmail || '').toLowerCase().includes(term) ||
        (log.targetType || '').toLowerCase().includes(term) ||
        (log.targetId || '').toLowerCase().includes(term)
      );
    });
  }, [logs, query]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Activity Logs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Complete audit trail for admin actions across users, jobs, companies, and settings.
            </p>
          </div>
          <button
            onClick={() => fetchLogs(page)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search action, description, admin, or target..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Target
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                        No activity logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium">{log.adminName || 'System'}</div>
                          {log.adminEmail && <div className="text-xs text-gray-500">{log.adminEmail}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{log.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {log.targetType || '-'}
                          {log.targetId ? ` (${log.targetId.slice(0, 8)}...)` : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="text-sm text-gray-600">
            Showing page <span className="font-semibold">{page}</span> of{' '}
            <span className="font-semibold">{totalPages}</span> ({total} total logs)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-gray-300 p-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-gray-300 p-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
