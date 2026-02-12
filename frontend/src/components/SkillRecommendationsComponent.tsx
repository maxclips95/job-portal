'use client';

import { useState, useEffect } from 'react';
import { predictiveService } from '@/services/predictive.service';
import { BookOpen, ArrowRight, Star, Clock, DollarSign, Target, Zap, ChevronDown } from 'lucide-react';

interface SkillRec {
  skill: string;
  relevanceScore: number;
  difficulty: string;
  marketDemand: number;
  salaryBoost: number;
  learningResources: any[];
  timeToMastery: number;
  prerequisiteSkills?: string[];
}

export const SkillRecommendationsComponent: React.FC<{ userId: string }> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<SkillRec[]>([]);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showCreatePath, setShowCreatePath] = useState(false);
  const [selectedSkillsForPath, setSelectedSkillsForPath] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recs, paths] = await Promise.all([
        predictiveService.getSkillRecommendations(userId, 10),
        predictiveService.getLearningPaths(userId),
      ]);

      setRecommendations(recs || []);
      setLearningPaths(paths || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLearningPath = async () => {
    if (selectedSkillsForPath.length === 0) return;

    try {
      await predictiveService.createLearningPath(userId, {
        targetSkills: selectedSkillsForPath,
        timeCommitmentHours: 10,
      });

      setSelectedSkillsForPath([]);
      setShowCreatePath(false);
      await loadData();
    } catch (error) {
      console.error('Failed to create learning path:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-200 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Skill Development</h2>
        <button
          onClick={() => setShowCreatePath(!showCreatePath)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <BookOpen size={18} />
          Create Learning Path
        </button>
      </div>

      {/* Create Path Modal */}
      {showCreatePath && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Select Skills to Learn</h3>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recommendations.map((rec) => (
              <label key={rec.skill} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedSkillsForPath.includes(rec.skill)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSkillsForPath([...selectedSkillsForPath, rec.skill]);
                    } else {
                      setSelectedSkillsForPath(selectedSkillsForPath.filter((s) => s !== rec.skill));
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{rec.skill}</p>
                  <p className="text-xs text-gray-600">{rec.timeToMastery} hours to mastery</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(rec.difficulty)}`}>
                  {rec.difficulty}
                </span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateLearningPath}
              disabled={selectedSkillsForPath.length === 0}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
            >
              Create Path ({selectedSkillsForPath.length})
            </button>
            <button
              onClick={() => setShowCreatePath(false)}
              className="flex-1 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Learning Paths */}
      {learningPaths.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap size={20} className="text-orange-600" />
            Your Learning Paths ({learningPaths.length})
          </h3>

          <div className="space-y-4">
            {learningPaths.filter((p) => p.status === 'active').map((path: any) => (
              <div key={path.id} className="p-5 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{path.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{path.targetSkills?.length || 0} skills • {path.estimatedCompletionHours} hours total</p>
                  </div>

                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">In Progress</span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-bold text-gray-900">{path.currentProgressPercent}%</span>
                  </div>

                  <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
                      style={{ width: `${path.currentProgressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {path.targetSkills?.map((skill: string) => (
                    <span key={skill} className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700 border border-gray-200">
                      {skill}
                    </span>
                  ))}
                </div>

                <button className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors flex items-center justify-center gap-2">
                  Continue Learning
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target size={20} className="text-blue-600" />
          Recommended Skills
        </h3>

        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.skill} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              {/* Card Header */}
              <button
                onClick={() => setSelectedSkill(selectedSkill === rec.skill ? null : rec.skill)}
                className="w-full px-5 py-4 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="text-left flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">{rec.skill}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className={`px-2 py-1 rounded font-medium ${getDifficultyColor(rec.difficulty)}`}>
                      {rec.difficulty}
                    </span>

                    <div className="flex items-center gap-1 text-gray-600">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span>{rec.relevanceScore.toFixed(0)}% relevant</span>
                    </div>

                    {rec.marketDemand > 75 && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                        High demand
                      </span>
                    )}
                  </div>
                </div>

                <ChevronDown
                  size={20}
                  className={`text-gray-500 transition-transform ${selectedSkill === rec.skill ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expanded Content */}
              {selectedSkill === rec.skill && (
                <div className="px-5 py-6 bg-white border-t border-gray-200 space-y-6">
                  {/* Key Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Time to Mastery</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{rec.timeToMastery} hrs</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Salary Boost</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">+${(rec.salaryBoost / 1000).toFixed(0)}k</p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">Market Demand</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{rec.marketDemand}%</p>
                    </div>
                  </div>

                  {/* Learning Resources */}
                  {rec.learningResources?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">Top Learning Resources</h5>
                      <div className="space-y-2">
                        {rec.learningResources.slice(0, 3).map((resource: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{resource.title}</p>
                              <p className="text-xs text-gray-600">
                                {resource.provider} • {resource.duration} hours • Rating: {resource.rating}/5
                              </p>
                            </div>

                            <a
                              href="#"
                              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                            >
                              Explore
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prerequisites */}
                  {(rec.prerequisiteSkills ?? []).length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Prerequisites</h5>
                      <div className="flex flex-wrap gap-2">
                        {(rec.prerequisiteSkills ?? []).map((skill: string) => (
                          <span key={skill} className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2">
                      <BookOpen size={16} />
                      Start Learning
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSkillsForPath([rec.skill]);
                        setShowCreatePath(true);
                      }}
                      className="flex-1 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                    >
                      Add to Path
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
