/**
 * Badge Showcase Component
 * Display available badges, eligibility status, progress, and achievements
 */

'use client';

import React, { useState } from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  level: string;
}

interface BadgeShowcaseProps {
  badges: Badge[];
  earnedBadges: string[];
  onCheckProgress: (badgeId: string) => void;
}

export const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({
  badges,
  earnedBadges,
  onCheckProgress,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, any>>({});

  const levelColors: Record<string, string> = {
    foundational: 'from-blue-400 to-blue-600',
    professional: 'from-purple-400 to-purple-600',
    expert: 'from-orange-400 to-orange-600',
    master: 'from-red-400 to-red-600',
  };

  const levelEmojis: Record<string, string> = {
    foundational: '🌱',
    professional: '🎯',
    expert: '🔥',
    master: '👑',
  };

  const handleBadgeClick = async (badgeId: string) => {
    setSelectedBadge(badgeId);
    if (!progress[badgeId]) {
      onCheckProgress(badgeId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Skill Badges</h2>
        <p className="text-gray-600">
          Earn badges by completing assessments and building your portfolio
        </p>
      </div>

      {/* Earned Badges Section */}
      {earnedBadges.length > 0 && (
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">✨ Badges Earned</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {badges
              .filter((b) => earnedBadges.includes(b.id))
              .map((badge) => (
                <div
                  key={badge.id}
                  className="text-center cursor-pointer transform hover:scale-110 transition"
                  onClick={() => handleBadgeClick(badge.id)}
                >
                  <div
                    className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl font-bold mb-2 bg-gradient-to-br ${
                      levelColors[badge.level] || 'from-gray-400 to-gray-600'
                    } text-white shadow-lg`}
                  >
                    {badge.icon}
                  </div>
                  <p className="font-semibold text-sm truncate">{badge.name}</p>
                  <p className="text-xs text-gray-600 capitalize">
                    {badge.level}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Available Badges */}
      <div>
        <h3 className="text-2xl font-bold mb-4">
          🎖️ Available Badges ({badges.length - earnedBadges.length} remaining)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges
            .filter((b) => !earnedBadges.includes(b.id))
            .map((badge) => (
              <div
                key={badge.id}
                onClick={() => handleBadgeClick(badge.id)}
                className="border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold bg-gradient-to-br ${
                      levelColors[badge.level] ||
                      'from-gray-400 to-gray-600'
                    } text-white`}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{badge.name}</h4>
                    <p className="text-xs font-semibold uppercase text-gray-500 mt-1">
                      {levelEmojis[badge.level]} {badge.level}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                {selectedBadge === badge.id && progress[badge.id] && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold">Overall Progress</span>
                        <span className="text-blue-600">
                          {progress[badge.id].overallProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${progress[badge.id].overallProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Assessment Score */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold">Assessment Score</span>
                        <span>
                          {progress[badge.id].assessmentScore.current} /{' '}
                          {progress[badge.id].assessmentScore.required}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-green-600 h-1.5 rounded-full transition-all"
                          style={{
                            width: `${progress[badge.id].assessmentScore.percentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold">Projects</span>
                      <span>
                        {progress[badge.id].practicalProjects.current} /{' '}
                        {progress[badge.id].practicalProjects.required}
                      </span>
                    </div>

                    {/* Endorsements */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold">Endorsements</span>
                      <span>
                        {progress[badge.id].endorsements.current} /{' '}
                        {progress[badge.id].endorsements.required}
                      </span>
                    </div>

                    <button className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
                      Work Towards Badge
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Badge Stats */}
      <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8">
        <h3 className="text-xl font-bold mb-4">Your Badge Stats</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {earnedBadges.length}
            </p>
            <p className="text-gray-600 mt-1">Badges Earned</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {badges.length - earnedBadges.length}
            </p>
            <p className="text-gray-600 mt-1">Available</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {Math.round((earnedBadges.length / badges.length) * 100)}%
            </p>
            <p className="text-gray-600 mt-1">Completion</p>
          </div>
        </div>
      </div>
    </div>
  );
};
