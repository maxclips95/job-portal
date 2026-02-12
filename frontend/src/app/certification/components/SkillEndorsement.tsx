/**
 * Skill Endorsement Component
 * Display endorsements, manage recommendations, and show trust score
 */

'use client';

import React, { useState } from 'react';

interface Endorsement {
  id: string;
  skillId: string;
  skillName: string;
  endorsedBy: string;
  level: string;
  message?: string;
  endorsementDate: Date;
}

interface SkillEndorsementProps {
  endorsements: Endorsement[];
  trustScore: number;
  totalEndorsements: number;
  availableSkills: Array<{ id: string; name: string }>;
  onAddEndorsement: (skillId: string, message?: string) => void;
  onRemoveEndorsement: (endorsementId: string) => void;
}

export const SkillEndorsement: React.FC<SkillEndorsementProps> = ({
  endorsements,
  trustScore,
  totalEndorsements,
  availableSkills,
  onAddEndorsement,
  onRemoveEndorsement,
}) => {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [isAddingEndorsement, setIsAddingEndorsement] = useState(false);
  const [newEndorsementSkill, setNewEndorsementSkill] = useState('');
  const [newEndorsementMessage, setNewEndorsementMessage] = useState('');

  const levelColors: Record<string, string> = {
    beginner: 'bg-blue-100 text-blue-800',
    intermediate: 'bg-purple-100 text-purple-800',
    advanced: 'bg-orange-100 text-orange-800',
    expert: 'bg-red-100 text-red-800',
  };

  const levelIcons: Record<string, string> = {
    beginner: '🌱',
    intermediate: '📈',
    advanced: '⚡',
    expert: '🔥',
  };

  const getTrustLevel = (score: number): string => {
    if (score >= 80) return 'Highly Trusted';
    if (score >= 60) return 'Trusted';
    if (score >= 40) return 'Developing';
    return 'New Member';
  };

  const getTrustColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const groupedBySkill = endorsements.reduce(
    (acc, endorsement) => {
      if (!acc[endorsement.skillId]) {
        acc[endorsement.skillId] = {
          name: endorsement.skillName,
          endorsements: [],
        };
      }
      acc[endorsement.skillId].endorsements.push(endorsement);
      return acc;
    },
    {} as Record<string, { name: string; endorsements: Endorsement[] }>
  );

  const handleAddEndorsement = () => {
    if (newEndorsementSkill) {
      onAddEndorsement(newEndorsementSkill, newEndorsementMessage);
      setNewEndorsementSkill('');
      setNewEndorsementMessage('');
      setIsAddingEndorsement(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Trust Score Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-sm text-gray-600 mb-1">Trust Score</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getTrustColor(trustScore)}`}>
                {trustScore}
              </span>
              <span className="text-gray-600">/100</span>
            </div>
            <p className={`text-sm font-semibold mt-2 ${getTrustColor(trustScore)}`}>
              {getTrustLevel(trustScore)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Total Endorsements</p>
            <p className="text-4xl font-bold text-purple-600">{totalEndorsements}</p>
            <p className="text-sm text-gray-600 mt-2">
              from industry professionals
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Skills Endorsed</p>
            <p className="text-4xl font-bold text-blue-600">
              {Object.keys(groupedBySkill).length}
            </p>
            <p className="text-sm text-gray-600 mt-2">unique skills</p>
          </div>
        </div>
      </div>

      {/* Add Endorsement Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Add Endorsement</h3>

        {!isAddingEndorsement ? (
          <button
            onClick={() => setIsAddingEndorsement(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Endorse a Skill
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill
              </label>
              <select
                value={newEndorsementSkill}
                onChange={(e) => setNewEndorsementSkill(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a skill...</option>
                {availableSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (optional)
              </label>
              <textarea
                value={newEndorsementMessage}
                onChange={(e) => setNewEndorsementMessage(e.target.value)}
                placeholder="Share why you're endorsing this skill..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddEndorsement}
                disabled={!newEndorsementSkill}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                Add Endorsement
              </button>
              <button
                onClick={() => setIsAddingEndorsement(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Endorsements by Skill */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Endorsed Skills</h3>

        {Object.keys(groupedBySkill).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              No endorsements yet. Connect with people and ask them to endorse your skills!
            </p>
          </div>
        ) : (
          Object.entries(groupedBySkill).map(([skillId, { name, endorsements: skillEndorsements }]) => (
            <div
              key={skillId}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
            >
              <button
                onClick={() =>
                  setExpandedSkill(expandedSkill === skillId ? null : skillId)
                }
                className="w-full p-4 hover:bg-gray-50 transition text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {skillEndorsements.length} endorsement
                      {skillEndorsements.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Level Distribution */}
                  <div className="flex gap-2 mr-4">
                    {['expert', 'advanced', 'intermediate', 'beginner'].map(
                      (level) => {
                        const count = skillEndorsements.filter(
                          (e) => e.level === level
                        ).length;
                        return count > 0 ? (
                          <span
                            key={level}
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              levelColors[level]
                            }`}
                          >
                            {count} {level}
                          </span>
                        ) : null;
                      }
                    )}
                  </div>

                  <svg
                    className={`w-5 h-5 text-gray-400 transition ${
                      expandedSkill === skillId ? 'rotate-180' : ''
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
              </button>

              {expandedSkill === skillId && (
                <div className="border-t border-gray-200 bg-gray-50 space-y-3 p-4">
                  {skillEndorsements.map((endorsement) => (
                    <div
                      key={endorsement.id}
                      className="bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                levelColors[endorsement.level]
                              }`}
                            >
                              {levelIcons[endorsement.level]}{' '}
                              {endorsement.level.charAt(0).toUpperCase() +
                                endorsement.level.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold">
                            {endorsement.endorsedBy}
                          </p>
                          {endorsement.message && (
                            <p className="text-sm text-gray-700 mt-2">
                              "{endorsement.message}"
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(endorsement.endorsementDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            onRemoveEndorsement(endorsement.id)
                          }
                          className="text-red-600 hover:text-red-800 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
