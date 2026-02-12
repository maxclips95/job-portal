'use client';

/**
 * ScreeningResults Component
 * Displays screening results in a data table with:
 * - Sorting (rank, match score, name)
 * - Filtering (min match %, category)
 * - Pagination
 * - Bulk selection and actions
 * - Row expansion for detailed view
 * - Export capabilities
 */

import React, { useState, useEffect } from 'react';
import { screeningService, ScreeningResult, ScreeningResultsResponse } from '@/services/screening/screeningService';

interface ScreeningResultsProps {
  screeningJobId: string;
  onExport?: (format: 'csv' | 'json') => void;
  onShortlistChange?: (candidateIds: string[]) => void;
}

type SortBy = 'rank' | 'match' | 'name';
type SortOrder = 'asc' | 'desc';

interface FilterState {
  minMatch: number;
  maxMatch: number;
  matchCategory: 'ALL' | 'STRONG' | 'MODERATE' | 'WEAK';
  shortlistedOnly: boolean;
}

export function ScreeningResults({ screeningJobId, onExport, onShortlistChange }: ScreeningResultsProps) {
  // State
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [responseData, setResponseData] = useState<ScreeningResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting
  const [sortBy, setSortBy] = useState<SortBy>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filtering
  const [filters, setFilters] = useState<FilterState>({
    minMatch: 0,
    maxMatch: 100,
    matchCategory: 'ALL',
    shortlistedOnly: false,
  });

  // Selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // UI State
  const [isExporting, setIsExporting] = useState(false);

  // Fetch results
  useEffect(() => {
    loadResults();
  }, [screeningJobId, currentPage, pageSize, sortBy, sortOrder, filters]);

  const loadResults = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await screeningService.getResults(screeningJobId, {
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder,
        minMatch: filters.minMatch,
        maxMatch: filters.maxMatch,
        matchCategory: filters.matchCategory === 'ALL' ? undefined : filters.matchCategory,
        showShortlistedOnly: filters.shortlistedOnly,
      });

      setResponseData(data);
      setResults(data.results);
      setSelectedRows(new Set()); // Clear selection on new results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  };

  // Selection handlers
  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === results.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(results.map((r) => r.id)));
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Sorting handlers
  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Filter handlers
  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      minMatch: 0,
      maxMatch: 100,
      matchCategory: 'ALL',
      shortlistedOnly: false,
    });
    setCurrentPage(1);
  };

  // Bulk actions
  const handleShortlist = async (action: 'add' | 'remove') => {
    if (selectedRows.size === 0) {
      alert('Please select at least one candidate');
      return;
    }

    try {
      await screeningService.updateShortlist({
        screeningJobId,
        candidateIds: Array.from(selectedRows),
        action,
      });

      // Update local state
      setResults((prev) =>
        prev.map((r) =>
          selectedRows.has(r.id) ? { ...r, isShortlisted: action === 'add' } : r
        )
      );

      setSelectedRows(new Set());

      if (onShortlistChange) {
        onShortlistChange(Array.from(selectedRows));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shortlist');
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);

    try {
      const blob = await screeningService.exportResults({
        screeningJobId,
        format,
        includeAll: selectedRows.size === 0,
        selectedCandidateIds: selectedRows.size > 0 ? Array.from(selectedRows) : undefined,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screening-results-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (onExport) {
        onExport(format);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export results');
    } finally {
      setIsExporting(false);
    }
  };

  // Helpers
  const getMatchBadgeColor = (category: string) => {
    switch (category) {
      case 'STRONG':
        return 'bg-green-100 text-green-800';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'WEAK':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSortIcon = (column: SortBy) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Screening Results</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Min Match Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Min Match: {filters.minMatch}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minMatch}
              onChange={(e) => updateFilter('minMatch', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Max Match Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Max Match: {filters.maxMatch}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.maxMatch}
              onChange={(e) => updateFilter('maxMatch', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.matchCategory}
              onChange={(e) => updateFilter('matchCategory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="STRONG">Strong</option>
              <option value="MODERATE">Moderate</option>
              <option value="WEAK">Weak</option>
            </select>
          </div>

          {/* Shortlisted Only */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.shortlistedOnly}
                onChange={(e) => updateFilter('shortlistedOnly', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-semibold text-gray-700">Shortlisted Only</span>
            </label>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {responseData && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600">Total Results</p>
            <p className="text-2xl font-bold text-blue-600">{responseData.totalResults}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-gray-600">Strong Matches</p>
            <p className="text-2xl font-bold text-green-600">{responseData.summary.strongMatches}</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-600">Moderate Matches</p>
            <p className="text-2xl font-bold text-yellow-600">{responseData.summary.moderateMatches}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-gray-600">Weak Matches</p>
            <p className="text-2xl font-bold text-red-600">{responseData.summary.weakMatches}</p>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-800">
            {selectedRows.size} candidate{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleShortlist('add')}
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Add to Shortlist
            </button>
            <button
              onClick={() => handleShortlist('remove')}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Remove from Shortlist
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Results Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading results...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No results found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === results.length && results.length > 0}
                    onChange={toggleAllRows}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('rank')}
                    className="text-sm font-semibold text-gray-700 hover:text-blue-600 flex items-center gap-1"
                  >
                    Rank {renderSortIcon('rank')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="text-sm font-semibold text-gray-700 hover:text-blue-600 flex items-center gap-1"
                  >
                    Candidate {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('match')}
                    className="text-sm font-semibold text-gray-700 hover:text-blue-600 flex items-center gap-1"
                  >
                    Match % {renderSortIcon('match')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Skills
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Shortlist
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <React.Fragment key={result.id}>
                  {/* Main Row */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(result.id)}
                        onChange={() => toggleRow(result.id)}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      #{result.rank}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {result.candidateName}
                        </p>
                        {result.candidateEmail && (
                          <p className="text-xs text-gray-500">{result.candidateEmail}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {result.matchPercentage.toFixed(1)}%
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{
                              width: `${result.matchPercentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getMatchBadgeColor(
                          result.matchCategory
                        )}`}
                      >
                        {result.matchCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {result.matchedSkills.slice(0, 2).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {result.matchedSkills.length > 2 && (
                          <span className="px-2 py-1 text-gray-600 text-xs">
                            +{result.matchedSkills.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={result.isShortlisted}
                        onChange={() => handleShortlist(result.isShortlisted ? 'remove' : 'add')}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleExpanded(result.id)}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                      >
                        {expandedRows.has(result.id) ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {expandedRows.has(result.id) && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">
                              Contact
                            </p>
                            <p className="text-sm text-gray-800">{result.candidateEmail}</p>
                            {result.candidatePhone && (
                              <p className="text-sm text-gray-800">{result.candidatePhone}</p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">
                              Score Breakdown
                            </p>
                            <div className="text-sm space-y-1 text-gray-700">
                              <p>Experience: {result.scoringBreakdown.experience.toFixed(1)}</p>
                              <p>Skills: {result.scoringBreakdown.skills.toFixed(1)}</p>
                              <p>Education: {result.scoringBreakdown.education.toFixed(1)}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">
                              Matched Skills
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {result.matchedSkills.map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {responseData && responseData.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-600 mr-2">Items per page:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="text-sm text-gray-600">
              Page {currentPage} of {responseData.totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(responseData.totalPages, currentPage + 1))}
              disabled={currentPage === responseData.totalPages}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreeningResults;
