'use client';

import { useState, useEffect } from 'react';
import { predictiveService } from '@/services/predictive.service';
import { TrendingUp, DollarSign, Clock, CheckCircle, Zap, Target, Users } from 'lucide-react';

interface CareerStep {
  step: number;
  role: string;
  duration: number;
  salary: number;
  skillsToLearn: string[];
}

export const CareerPathPredictor: React.FC<{ userId: string }> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [careerPath, setCareerPath] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [horizonYears, setHorizonYears] = useState(5);

  useEffect(() => {
    loadCareerData();
  }, [userId, horizonYears]);

  const loadCareerData = async () => {
    try {
      setLoading(true);
      const [pathData, insightsData, salaryInfo] = await Promise.all([
        predictiveService.getPredictedCareerPath(userId, { horizonYears, includeCompensation: true }),
        predictiveService.getCareerInsights(userId),
        predictiveService.getSalaryInsights(userId),
      ]);

      setCareerPath(pathData);
      setInsights(insightsData || []);
      setSalaryData(salaryInfo);
    } catch (error) {
      console.error('Failed to load career data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const totalSalaryGrowth = careerPath?.careerPath
    ? careerPath.careerPath[careerPath.careerPath.length - 1]?.salary -
      (careerPath.careerPath[0]?.salary || 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Career Path</h2>
          <p className="text-gray-600 mt-1">Based on your skills, experience, and market trends</p>
        </div>

        <div className="flex gap-2">
          {[2, 5, 10].map((years) => (
            <button
              key={years}
              onClick={() => setHorizonYears(years)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                horizonYears === years
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {years} years
            </button>
          ))}
        </div>
      </div>

      {/* Confidence Score */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Prediction Confidence</h3>
            <p className="text-blue-100 mt-1">How confident we are in this prediction</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-5xl font-bold">{careerPath?.confidenceScore?.toFixed(0) || 0}%</div>
            <div className="w-32 h-2 bg-white bg-opacity-30 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${careerPath?.confidenceScore || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Career Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-8 flex items-center gap-2">
          <TrendingUp size={24} />
          Career Progression Timeline
        </h3>

        <div className="space-y-6">
          {careerPath?.careerPath?.map((step: CareerStep, idx: number) => (
            <div key={idx} className="relative">
              {/* Timeline connector */}
              {idx < (careerPath?.careerPath?.length - 1) && (
                <div className="absolute left-8 top-20 w-1 h-16 bg-gradient-to-b from-blue-400 to-gray-300" />
              )}

              {/* Step card */}
              <button
                onClick={() => setSelectedStep(selectedStep === idx ? null : idx)}
                className="w-full text-left"
              >
                <div className={`flex gap-6 p-5 rounded-lg border-2 transition-all ${
                  selectedStep === idx
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}>
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg z-10 relative">
                    {idx + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 py-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{step.role}</h4>
                        <p className="text-gray-600 text-sm mt-1">
                          {idx === 0 ? 'Current' : `+${step.duration} years`}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                          <DollarSign size={20} />
                          {(step.salary / 1000).toFixed(0)}k
                        </p>
                        {idx > 0 && (
                          <p className="text-green-600 text-sm font-medium">
                            +${((step.salary - (careerPath.careerPath[idx - 1]?.salary || 0)) / 1000).toFixed(0)}k growth
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {selectedStep === idx && (
                  <div className="mt-4 p-5 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Target size={18} />
                        Key Skills Required
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {step.skillsToLearn?.map((skill: string, sidx: number) => (
                          <span
                            key={sidx}
                            className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded border border-blue-200">
                        <p className="text-xs text-gray-600 font-medium mb-1">Duration</p>
                        <p className="text-lg font-bold text-gray-900">{step.duration} years</p>
                      </div>

                      <div className="p-3 bg-white rounded border border-blue-200">
                        <p className="text-xs text-gray-600 font-medium mb-1">Target Salary</p>
                        <p className="text-lg font-bold text-green-600">${(step.salary / 1000).toFixed(0)}k</p>
                      </div>
                    </div>

                    <button className="w-full text-center py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      View Learning Path
                    </button>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Total Growth Summary */}
        <div className="mt-8 pt-8 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg text-center">
            <p className="text-gray-600 text-sm font-medium">Total Salary Growth</p>
            <p className="text-3xl font-bold text-green-600 mt-2">${(totalSalaryGrowth / 1000).toFixed(0)}k</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg text-center">
            <p className="text-gray-600 text-sm font-medium">Total Timeline</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{horizonYears} years</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg text-center">
            <p className="text-gray-600 text-sm font-medium">Avg Annual Growth</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">${(totalSalaryGrowth / horizonYears / 1000).toFixed(0)}k</p>
          </div>
        </div>
      </div>

      {/* Career Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap size={20} />
            Career Insights
          </h3>

          <div className="space-y-3">
            {insights.slice(0, 3).map((insight: any, idx: number) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-1.5" />
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{insight.insight}</p>
                    <p className="text-gray-600 text-sm mt-2">{insight.expectedOutcome}</p>

                    {insight.actionItems?.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {insight.actionItems.map((item: string, aidx: number) => (
                          <li key={aidx} className="text-sm text-gray-700 flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-orange-600">{(insight.confidence * 100).toFixed(0)}%</div>
                    <p className="text-xs text-gray-600">confidence</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salary Comparison */}
      {salaryData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            Salary Insights
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-gray-600 text-sm font-medium">Current Salary</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">${(salaryData.currentSalary / 1000).toFixed(0)}k</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-gray-600 text-sm font-medium">Market Median</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${(salaryData.marketMedian / 1000).toFixed(0)}k</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-gray-600 text-sm font-medium">Potential Growth</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                +${(salaryData.potentialIncrease / 1000).toFixed(0)}k
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 font-medium mb-2">Your percentile: {salaryData.percentile}%</p>
            <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                style={{ width: `${salaryData.percentile}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
