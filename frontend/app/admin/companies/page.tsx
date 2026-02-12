'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Eye, Loader, Search, XCircle } from 'lucide-react';

type VerificationLevel = 'unverified' | 'basic' | 'full';
type ReviewStage =
  | 'auto_screened'
  | 'docs_requested'
  | 'under_manual_review'
  | 'approved_basic'
  | 'approved_full'
  | 'rejected';

interface Company {
  id: string;
  name: string;
  email: string;
  industry: string;
  employees: number;
  location: string;
  website?: string;
  status: 'pending' | 'verified' | 'rejected';
  verificationLevel?: VerificationLevel;
  reviewStage?: ReviewStage;
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresDocuments?: boolean;
  documentsSubmitted?: boolean;
  requiredDocuments?: string[];
  reviewNotes?: string | null;
  submittedAt: string;
  rejectionReason?: string | null;
}

const DEFAULT_REQUIRED_DOCS = [
  'Business registration proof',
  'Tax registration (GST/CIN/PAN)',
  'Authorized signatory letter',
].join('\n');

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentReason, setDocumentReason] = useState('');
  const [requiredDocumentsText, setRequiredDocumentsText] = useState(DEFAULT_REQUIRED_DOCS);
  const [reviewNotes, setReviewNotes] = useState('');

  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const endpoint = statusFilter === 'pending' ? '/api/admin/companies/pending' : '/api/admin/companies';
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

  useEffect(() => {
    fetchCompanies();
  }, [statusFilter]);

  const filteredCompanies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((company) => {
      return (
        company.name.toLowerCase().includes(q) ||
        company.email.toLowerCase().includes(q) ||
        company.location.toLowerCase().includes(q)
      );
    });
  }, [companies, searchTerm]);

  const resetReviewState = () => {
    setSelectedCompanyId(null);
    setRejectionReason('');
    setDocumentReason('');
    setReviewNotes('');
  };

  const handleViewDetails = (companyId: string) => {
    const company = companies.find((item) => item.id === companyId) || null;
    setCompanyDetails(company);
    setShowDetails(true);
  };

  const handleVerifyCompany = async (companyId: string, level: 'basic' | 'full') => {
    try {
      setProcessing(true);
      await axios.put(
        `/api/admin/companies/${companyId}/verify`,
        {
          level,
          reviewNotes: reviewNotes.trim() || undefined,
        },
        { withCredentials: true }
      );
      resetReviewState();
      await fetchCompanies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify company');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCompany = async (companyId: string) => {
    try {
      setProcessing(true);
      const reason = rejectionReason.trim() || 'Company verification rejected by admin';
      await axios.put(`/api/admin/companies/${companyId}/reject`, { reason }, { withCredentials: true });
      resetReviewState();
      await fetchCompanies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject company');
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestDocuments = async (companyId: string) => {
    try {
      setProcessing(true);
      const requiredDocuments = requiredDocumentsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      await axios.put(
        `/api/admin/companies/${companyId}/request-documents`,
        {
          reason: documentReason.trim() || 'Additional compliance documents are required',
          requiredDocuments,
        },
        { withCredentials: true }
      );
      resetReviewState();
      await fetchCompanies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request documents');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkDocumentsReceived = async (companyId: string) => {
    try {
      setProcessing(true);
      await axios.put(
        `/api/admin/companies/${companyId}/mark-documents-received`,
        {
          reviewNotes: reviewNotes.trim() || 'Documents received and queued for manual review',
        },
        { withCredentials: true }
      );
      await fetchCompanies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark documents received');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: Company['status']) => {
    if (status === 'verified') {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Verified
        </span>
      );
    }

    if (status === 'rejected') {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }

    return (
      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Pending</span>
    );
  };

  const getRiskBadge = (riskLevel?: Company['riskLevel'], riskScore?: number) => {
    if (!riskLevel) return null;
    if (riskLevel === 'high') {
      return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">High Risk ({riskScore || 0})</span>;
    }
    if (riskLevel === 'medium') {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Medium Risk ({riskScore || 0})</span>;
    }
    return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Low Risk ({riskScore || 0})</span>;
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Verification</h1>
          <p className="text-gray-600">Risk-based trust review (Naukri-style: screen -> docs -> approve/reject)</p>
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search company, email, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCompanies.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 text-lg">No companies found matching your filters</p>
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <div key={company.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{company.name}</h3>
                    <p className="text-gray-600 text-sm">{company.email}</p>
                  </div>
                  <div>{getStatusBadge(company.status)}</div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div>Location: {company.location || 'Not provided'}</div>
                  <div>Industry: {company.industry}</div>
                  <div>Employees: {company.employees.toLocaleString()}</div>
                  <div>Verification Level: <span className="font-semibold uppercase text-gray-800">{company.verificationLevel || 'unverified'}</span></div>
                  <div>Review Stage: <span className="font-semibold text-gray-800">{(company.reviewStage || 'auto_screened').replace(/_/g, ' ')}</span></div>
                  <div>{getRiskBadge(company.riskLevel, company.riskScore)}</div>
                  {company.requiresDocuments && (
                    <div className="text-amber-700">Documents required: {(company.requiredDocuments || []).join(', ') || 'Yes'}</div>
                  )}
                  {company.reviewNotes && <div className="text-gray-700">Review Notes: {company.reviewNotes}</div>}
                  {company.rejectionReason && <div className="text-red-700">Rejection Reason: {company.rejectionReason}</div>}
                  {company.website && (
                    <div>
                      Website:{' '}
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {company.website}
                      </a>
                    </div>
                  )}
                </div>

                {company.status === 'pending' ? (
                  <div className="space-y-3">
                    {selectedCompanyId === company.id ? (
                      <div className="space-y-3">
                        <textarea
                          placeholder="Review notes (optional)..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={2}
                        />
                        <textarea
                          placeholder="Reason to request documents..."
                          value={documentReason}
                          onChange={(e) => setDocumentReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          rows={2}
                        />
                        <textarea
                          placeholder="Required documents (one per line)..."
                          value={requiredDocumentsText}
                          onChange={(e) => setRequiredDocumentsText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          rows={3}
                        />
                        <textarea
                          placeholder="Reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          rows={2}
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyCompany(company.id, 'basic')}
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition font-medium"
                          >
                            {processing ? 'Processing...' : 'Verify Basic'}
                          </button>
                          <button
                            onClick={() => handleVerifyCompany(company.id, 'full')}
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition font-medium"
                          >
                            {processing ? 'Processing...' : 'Verify Full'}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRequestDocuments(company.id)}
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition font-medium"
                          >
                            {processing ? 'Processing...' : 'Request Documents'}
                          </button>
                          <button
                            onClick={() => handleMarkDocumentsReceived(company.id)}
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
                          >
                            {processing ? 'Processing...' : 'Docs Received'}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectCompany(company.id)}
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium"
                          >
                            {processing ? 'Processing...' : 'Reject'}
                          </button>
                          <button
                            onClick={resetReviewState}
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
                          onClick={() => handleViewDetails(company.id)}
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
                    onClick={() => handleViewDetails(company.id)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                  Submitted on {new Date(company.submittedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Total Companies</div>
            <div className="text-2xl font-bold text-gray-900">{companies.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Pending Verification</div>
            <div className="text-2xl font-bold text-yellow-600">{companies.filter((c) => c.status === 'pending').length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Needs Documents</div>
            <div className="text-2xl font-bold text-amber-600">{companies.filter((c) => c.reviewStage === 'docs_requested').length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Verified</div>
            <div className="text-2xl font-bold text-green-600">{companies.filter((c) => c.status === 'verified').length}</div>
          </div>
        </div>

        {showDetails && companyDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{companyDetails.name}</h2>
                  <p className="text-gray-600">{companyDetails.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setCompanyDetails(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  x
                </button>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div>Status: {companyDetails.status}</div>
                <div>Verification Level: {companyDetails.verificationLevel || 'unverified'}</div>
                <div>Review Stage: {(companyDetails.reviewStage || 'auto_screened').replace(/_/g, ' ')}</div>
                <div>Risk: {(companyDetails.riskLevel || 'medium')} ({companyDetails.riskScore || 0})</div>
                <div>Industry: {companyDetails.industry}</div>
                <div>Employees: {companyDetails.employees.toLocaleString()}</div>
                <div>Location: {companyDetails.location}</div>
                <div>Submitted: {new Date(companyDetails.submittedAt).toLocaleString()}</div>
                {companyDetails.reviewNotes && <div>Review Notes: {companyDetails.reviewNotes}</div>}
                {companyDetails.requiredDocuments && companyDetails.requiredDocuments.length > 0 && (
                  <div>Required Documents: {companyDetails.requiredDocuments.join(', ')}</div>
                )}
                {companyDetails.rejectionReason && <div>Rejection Reason: {companyDetails.rejectionReason}</div>}
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
