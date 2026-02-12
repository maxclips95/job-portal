'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Loader,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  email: string;
  industry: string;
  employees: number;
  location: string;
  website?: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>(
    'pending'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const endpoint = statusFilter === 'pending'
          ? '/api/admin/companies/pending'
          : '/api/admin/companies';

        const response = await axios.get(endpoint, {
          params: statusFilter !== 'pending' ? { status: statusFilter } : {},
          withCredentials: true,
        });

        setCompanies(response.data.companies || []);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [statusFilter]);

  // Filter companies
  useEffect(() => {
    let filtered = companies.filter((company) => {
      const matchesSearch =
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.location.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });

    setFilteredCompanies(filtered);
  }, [searchTerm, companies]);

  // View company details
  const handleViewDetails = async (companyId: string) => {
    try {
      const company = companies.find((c) => c.id === companyId);
      setCompanyDetails(company);
      setShowDetails(true);
    } catch (err) {
      setError('Failed to load company details');
    }
  };

  // Verify company
  const handleVerifyCompany = async (companyId: string) => {
    try {
      setProcessing(true);
      await axios.put(
        `/api/admin/companies/${companyId}/verify`,
        {},
        { withCredentials: true }
      );

      setCompanies(
        companies.map((company) =>
          company.id === companyId
            ? { ...company, status: 'verified' }
            : company
        )
      );
      setSelectedCompanyId(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify company');
    } finally {
      setProcessing(false);
    }
  };

  // Reject company
  const handleRejectCompany = async (companyId: string) => {
    try {
      setProcessing(true);
      await axios.put(
        `/api/admin/companies/${companyId}/reject`,
        { reason: rejectionReason },
        { withCredentials: true }
      );

      setCompanies(
        companies.map((company) =>
          company.id === companyId
            ? { ...company, status: 'rejected' }
            : company
        )
      );
      setSelectedCompanyId(null);
      setRejectionReason('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject company');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
            Pending
          </span>
        );
      case 'verified':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Company Verification
          </h1>
          <p className="text-gray-600">
            Review and verify employer company profiles
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company name, email, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Companies</option>
            </select>
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 border-blue-500"
              >
                {/* Company Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {company.name}
                    </h3>
                    <p className="text-gray-600 text-sm">{company.email}</p>
                  </div>
                  <div>{getStatusBadge(company.status)}</div>
                </div>

                {/* Company Details */}
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div>📍 {company.location}</div>
                  <div>🏢 {company.industry}</div>
                  <div>👥 {company.employees.toLocaleString()} employees</div>
                  {company.website && (
                    <div>
                      🌐{' '}
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {company.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {company.status === 'pending' ? (
                  <div className="space-y-3">
                    {selectedCompanyId === company.id ? (
                      <div className="space-y-3">
                        <textarea
                          placeholder="Reason for rejection (optional)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleVerifyCompany(company.id)
                            }
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {processing ? 'Processing...' : 'Verify'}
                          </button>
                          <button
                            onClick={() =>
                              handleRejectCompany(company.id)
                            }
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            {processing ? 'Processing...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCompanyId(null);
                              setRejectionReason('');
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedCompanyId(company.id)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                        >
                          Review
                        </button>
                        <button
                          onClick={() =>
                            handleViewDetails(company.id)
                          }
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      handleViewDetails(company.id)
                    }
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                )}

                {/* Submitted Date */}
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                  Submitted on {new Date(company.submittedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600 text-lg">
                No companies found matching your filters
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Total Companies</div>
            <div className="text-2xl font-bold text-gray-900">
              {companies.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Pending Verification</div>
            <div className="text-2xl font-bold text-yellow-600">
              {companies.filter((c) => c.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Verified</div>
            <div className="text-2xl font-bold text-green-600">
              {companies.filter((c) => c.status === 'verified').length}
            </div>
          </div>
        </div>

        {/* Company Details Modal */}
        {showDetails && companyDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {companyDetails.name}
                  </h2>
                  <p className="text-gray-600">{companyDetails.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setCompanyDetails(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Company Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Industry
                    </label>
                    <p className="text-gray-900">{companyDetails.industry}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Employees
                    </label>
                    <p className="text-gray-900">
                      {companyDetails.employees.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Location
                    </label>
                    <p className="text-gray-900">{companyDetails.location}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Status
                    </label>
                    {getStatusBadge(companyDetails.status)}
                  </div>
                </div>

                {/* Website */}
                {companyDetails.website && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Website
                    </label>
                    <a
                      href={companyDetails.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {companyDetails.website}
                    </a>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <a
                    href={`mailto:${companyDetails.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {companyDetails.email}
                  </a>
                </div>

                {/* Submitted Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Submitted
                  </label>
                  <p className="text-gray-900">
                    {new Date(companyDetails.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setCompanyDetails(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
