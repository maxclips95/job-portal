'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Loader, RefreshCw } from 'lucide-react';

interface ActivityLog {
  id: string;
  adminId: string | null;
  adminName: string;
  adminEmail: string | null;
  action: string;
  description: string;
  targetId: string | null;
  targetType: string | null;
  createdAt: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      const response = await axios.get('/api/admin/activity-logs', {
        params: { limit, offset },
        withCredentials: true,
      });
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Logs</h1>
            <p className="text-gray-600">Audit trail of admin actions on users, jobs, and companies</p>
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Loader className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading activity logs...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">When</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Admin</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-600">
                        No activity logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="font-medium">{log.adminName || 'System'}</div>
                          <div className="text-gray-500">{log.adminEmail || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800 font-semibold">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{log.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {log.targetType || '-'} {log.targetId ? `(${log.targetId})` : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total logs: <span className="font-semibold">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
