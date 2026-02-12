'use client';

import React, { useState } from 'react';
import { aiService } from '@/services/ai.service';
import { TrendingUp, CheckCircle, XCircle, Loader } from 'lucide-react';

interface JobMatchProps {
  jobId: string;
  jobTitle: string;
  resumeSkills: string[];
}

export default function JobMatchCard({ jobId, jobTitle, resumeSkills }: JobMatchProps) {
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<any>(null);
  const [showMatch, setShowMatch] = useState(false);

  const handleCalculateMatch = async () => {
    setLoading(true);
    try {
      const result = await aiService.matchJob(jobId, resumeSkills);
      setMatch(result);
      setShowMatch(true);
    } catch (err) {
      console.error('Failed to calculate match:', err);
    } finally {
      setLoading(false);
    }
  };

  if (showMatch && match) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 space-y-4">
        {/* Match Score */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Match Analysis</h3>
          <div className="flex items-center gap-2">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={
                    match.matchPercentage >= 80
                      ? '#10b981'
                      : match.matchPercentage >= 60
                      ? '#f59e0b'
                      : '#ef4444'
                  }
                  strokeWidth="4"
                  strokeDasharray={`${(match.matchPercentage / 100) * 176} 176`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{match.matchPercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-600">{match.summary}</p>

        {/* Matched Skills */}
        <div>
          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Matched ({match.matchedSkills.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {match.matchedSkills.slice(0, 5).map((skill: any, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                {skill.skill}
              </span>
            ))}
          </div>
        </div>

        {/* Missing Skills */}
        {match.missingSkills.length > 0 && (
          <div>
            <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Missing ({match.missingSkills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {match.missingSkills.slice(0, 5).map((skill: any, idx: number) => (
                <span
                  key={idx}
                  className={`px-2 py-1 text-xs rounded ${
                    skill.importance === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {skill.skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {match.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {match.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleCalculateMatch}
      disabled={loading}
      className="w-full p-4 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center justify-center gap-2"
    >
      {loading && <Loader className="h-4 w-4 animate-spin" />}
      <TrendingUp className="h-4 w-4" />
      <span className="font-medium">
        {loading ? 'Calculating Match...' : 'Check Match Score'}
      </span>
    </button>
  );
}
