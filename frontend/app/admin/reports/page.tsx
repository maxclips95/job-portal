'use client';

import { useMemo, useState } from 'react';
import axios from 'axios';
import { Download, FileText, Loader } from 'lucide-react';

type ReportKind = 'users' | 'jobs' | 'companies' | 'activity';

const titles: Record<ReportKind, string> = {
  users: 'Users Report',
  jobs: 'Jobs Moderation Report',
  companies: 'Company Verification Report',
  activity: 'Admin Activity Report',
};

export default function AdminReportsPage() {
  const [kind, setKind] = useState<ReportKind>('users');
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    if (kind === 'users') return '/api/admin/users?limit=1000&offset=0';
    if (kind === 'jobs') return '/api/admin/jobs?status=all&limit=1000&offset=0';
    if (kind === 'companies') return '/api/admin/companies?status=all&limit=1000&offset=0';
    return '/api/admin/activity-logs?limit=1000&offset=0';
  }, [kind]);

  const normalizeRows = (payload: any): Record<string, unknown>[] => {
    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.jobs)) return payload.jobs;
    if (Array.isArray(payload?.companies)) return payload.companies;
    if (Array.isArray(payload?.logs)) return payload.logs;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const toCsv = (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return 'no_data\n';
    const columns = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>())
    );

    const escapeCell = (value: unknown) => {
      const text = value == null ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const header = columns.join(',');
    const body = rows
      .map((row) => columns.map((col) => escapeCell(row[col])).join(','))
      .join('\n');
    return `${header}\n${body}\n`;
  };

  const download = async () => {
    setDownloading(true);
    setMessage(null);
    try {
      const response = await axios.get(endpoint, { withCredentials: true });
      const rows = normalizeRows(response.data);
      const csv = toCsv(rows);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${kind}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMessage(`${titles[kind]} downloaded (${rows.length} rows).`);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to generate report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Reports</h1>
          <p className="text-gray-600 mt-1">Generate downloadable CSV reports for operations and audits.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ReportKind)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="users">Users</option>
                <option value="jobs">Jobs</option>
                <option value="companies">Companies</option>
                <option value="activity">Activity Logs</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={download}
                disabled={downloading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {downloading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Generating...' : `Download ${titles[kind]}`}
              </button>
            </div>
          </div>

          <div className="rounded border border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-2 text-gray-800 font-medium mb-2">
              <FileText className="w-4 h-4" />
              Export Details
            </div>
            <p className="text-sm text-gray-600">
              Current export pulls up to 1000 rows from admin endpoints and converts response payload to CSV.
            </p>
            {message && <p className="text-sm mt-3 text-blue-700">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
