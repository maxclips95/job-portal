/**
 * Certification Display Component
 * Shows earned certifications with verification, sharing, and renewal options
 */

'use client';

import React, { useState } from 'react';

interface Certification {
  id: string;
  skillId: string;
  level: string;
  earnedDate: Date;
  expiryDate?: Date;
  credentialUrl: string;
  status: string;
}

interface CertificationDisplayProps {
  certifications: Certification[];
  onShare?: (certId: string) => void;
  onRenew?: (certId: string) => void;
  onVerify?: (token: string) => void;
}

export const CertificationDisplay: React.FC<CertificationDisplayProps> = ({
  certifications,
  onShare,
  onRenew,
  onVerify,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({});

  const levelColors: Record<string, string> = {
    foundational: 'bg-blue-100 text-blue-800',
    professional: 'bg-purple-100 text-purple-800',
    expert: 'bg-orange-100 text-orange-800',
    master: 'bg-red-100 text-red-800',
  };

  const handleShare = async (certId: string) => {
    if (onShare) {
      onShare(certId);
    }
  };

  const isExpiring = (expiryDate?: Date) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate?: Date) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {certifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            No certifications earned yet. Start an assessment to earn your first certification!
          </p>
        </div>
      ) : (
        certifications.map((cert) => (
          <div
            key={cert.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
          >
            <div
              className="p-4 cursor-pointer bg-white hover:bg-gray-50"
              onClick={() =>
                setExpandedId(expandedId === cert.id ? null : cert.id)
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">
                      Skill Certification
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        levelColors[cert.level] ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {cert.level.charAt(0).toUpperCase() +
                        cert.level.slice(1)}
                    </span>
                    {isExpiring(cert.expiryDate) && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                        Expiring Soon
                      </span>
                    )}
                    {isExpired(cert.expiryDate) && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Earned on {formatDate(cert.earnedDate)}
                    {cert.expiryDate && ` • Expires on ${formatDate(cert.expiryDate)}`}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition ${
                    expandedId === cert.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            </div>

            {expandedId === cert.id && (
              <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Credential ID</p>
                    <p className="font-mono text-sm mt-1">
                      {cert.id.substring(0, 12)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-semibold mt-1">{cert.status}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleShare(cert.id)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
                  >
                    📤 Share Credential
                  </button>

                  {cert.expiryDate && isExpiring(cert.expiryDate) && (
                    <button
                      onClick={() => onRenew?.(cert.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
                    >
                      🔄 Renew
                    </button>
                  )}

                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition text-center"
                  >
                    🔗 View Badge
                  </a>
                </div>

                {shareLinks[cert.id] && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700 mb-2">Share Link:</p>
                    <input
                      type="text"
                      value={shareLinks[cert.id]}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareLinks[cert.id]);
                        alert('Share link copied!');
                      }}
                      className="mt-2 w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
