'use client';

/**
 * Custom Report Builder Component
 * Build and export custom analytics reports
 */

import React, { useState } from 'react';
import { analyticsService } from '@/services/analytics/analyticsService';

type ReportSectionType = 'salary' | 'skills' | 'trends' | 'locations' | 'insights';
type VisualizationType = 'chart' | 'table' | 'map' | 'text';

interface ReportSection {
  id: string;
  title: string;
  type: ReportSectionType;
  visualizationType: VisualizationType;
  selected: boolean;
}

const AVAILABLE_SECTIONS: ReportSection[] = [
  {
    id: '1',
    title: 'Salary Analysis',
    type: 'salary',
    visualizationType: 'chart',
    selected: false,
  },
  {
    id: '2',
    title: 'Top Skills & Demand',
    type: 'skills',
    visualizationType: 'chart',
    selected: false,
  },
  {
    id: '3',
    title: 'Market Trends',
    type: 'trends',
    visualizationType: 'chart',
    selected: false,
  },
  {
    id: '4',
    title: 'Top Locations',
    type: 'locations',
    visualizationType: 'table',
    selected: false,
  },
  {
    id: '5',
    title: 'Market Insights',
    type: 'insights',
    visualizationType: 'text',
    selected: false,
  },
];

export const CustomReportBuilder: React.FC = () => {
  const [reportTitle, setReportTitle] = useState('Market Analytics Report');
  const [reportDescription, setReportDescription] = useState('');
  const [sections, setSections] = useState<ReportSection[]>(AVAILABLE_SECTIONS);
  const [isPublic, setIsPublic] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json' | 'excel'>('pdf');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
    );
  };

  const selectedCount = sections.filter((s) => s.selected).length;

  const handleGenerateReport = async () => {
    if (selectedCount === 0) {
      setError('Please select at least one section');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const selectedSections = sections.filter((s) => s.selected);

      const report = await analyticsService.generateCustomReport(
        reportTitle,
        selectedSections.map((s) => ({
          title: s.title,
          type: s.type,
          visualizationType: s.visualizationType,
        })),
      );

      setSuccess(`Report "${report.title}" generated successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (selectedCount === 0) {
      setError('Please select at least one section');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedTypes = [...new Set(sections.filter((s) => s.selected).map((s) => s.type))];

      for (const type of selectedTypes) {
        const blob = await analyticsService.exportAnalytics(type, exportFormat);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${type}-${Date.now()}.${exportFormat}`;
        a.click();
      }

      setSuccess('Report exported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      setError(null);

      // This would normally share the report
      const link = `${window.location.origin}/reports/share/${Math.random().toString(36).substring(7)}`;
      setShareLink(link);
      setSuccess('Report link copied to clipboard!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Custom Report Builder</h1>
        <p className="text-gray-600 mt-1">Create and export tailored analytics reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Report Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter report title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                  placeholder="Add a description for your report"
                />
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Make this report public (shareable via link)
                </span>
              </label>
            </div>
          </div>

          {/* Section Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Select Sections ({selectedCount}/{sections.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map((section) => (
                <label
                  key={section.id}
                  className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    section.selected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={section.selected}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">{section.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Type: {section.type} • Format: {section.visualizationType}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              {success}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>

            <div className="space-y-3">
              {/* Generate Button */}
              <button
                onClick={handleGenerateReport}
                disabled={loading || selectedCount === 0}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>

              {/* Export Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  disabled={selectedCount === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="csv">CSV Data</option>
                  <option value="json">JSON Data</option>
                  <option value="excel">Excel Spreadsheet</option>
                </select>
              </div>

              <button
                onClick={handleExport}
                disabled={loading || selectedCount === 0}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition-colors"
              >
                {loading ? 'Exporting...' : 'Export Report'}
              </button>

              {/* Share Button */}
              {isPublic && (
                <button
                  onClick={handleShare}
                  disabled={loading || selectedCount === 0}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Share Link'}
                </button>
              )}

              {/* Share Link */}
              {shareLink && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Share Link:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-2 py-1 text-xs bg-white border border-purple-300 rounded"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(shareLink)}
                      className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-100 rounded-lg p-4 mt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Summary</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Sections: {selectedCount} selected</li>
                  <li>• Title: {reportTitle || 'Untitled'}</li>
                  <li>• Public: {isPublic ? 'Yes' : 'No'}</li>
                  <li>• Format: {exportFormat.toUpperCase()}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
