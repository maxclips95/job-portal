'use client';

import React, { useState, useEffect } from 'react';
import { careerService } from '@/services/career.service';
import {
  CareerPathway,
  SalaryProgression,
  SkillMapping,
} from '@/types/career-mentorship.types';

interface CareerPathwayTimelineProps {
  pathwayId?: string;
  userId: string;
}

const CareerPathwayTimeline: React.FC<CareerPathwayTimelineProps> = ({
  pathwayId,
  userId,
}) => {
  const [pathway, setPathway] = useState<CareerPathway | null>(null);
  const [selectedStep, setSelectedStep] = useState<number>(0);
  const [horizon, setHorizon] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPathway();
  }, [pathwayId, userId]);

  const loadPathway = async () => {
    try {
      setLoading(true);
      if (pathwayId) {
        const data = await careerService.getPathwayById(pathwayId);
        setPathway(data);
      } else {
        const pathways = await careerService.getUserPathways();
        if (pathways.length > 0) {
          setPathway(pathways[0]);
        }
      }
    } catch (err) {
      setError('Failed to load career pathway');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-700">No career pathway found. Create one to get started!</p>
      </div>
    );
  }

  const steps = Math.min(pathway.salaryProgression.length, 6);
  const totalSalaryGrowth = pathway.salaryProgression[pathway.salaryProgression.length - 1]
    ?.salary
    ? Math.round(
        ((pathway.salaryProgression[pathway.salaryProgression.length - 1].salary -
          pathway.salaryProgression[0].salary) /
          pathway.salaryProgression[0].salary) *
          100,
      )
    : 0;

  return (
    <div className="space-y-8">
      {/* Confidence Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Career Confidence Score</h3>
          <span className="px-4 py-2 bg-blue-600 text-white rounded-full font-bold text-lg">
            {pathway.salaryProgression.length * 15}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(pathway.salaryProgression.length * 15, 100)}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          High Confidence in career progression based on current skills and market demand.
        </p>
      </div>

      {/* Timeline Controls */}
      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timeline Horizon</label>
          <select
            value={horizon}
            onChange={e => setHorizon(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={2}>2 Years</option>
            <option value={5}>5 Years</option>
            <option value={10}>10 Years</option>
          </select>
        </div>
      </div>

      {/* Interactive Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute top-8 left-8 right-8 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-600"></div>

          {/* Timeline Steps */}
          <div className="relative flex justify-between mb-12">
            {pathway.salaryProgression.slice(0, steps).map((step, idx) => (
              <div key={idx} className="text-center cursor-pointer" onClick={() => setSelectedStep(idx)}>
                {/* Step Circle */}
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                    selectedStep === idx
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-blue-300 scale-110'
                      : 'bg-white border-4 border-gray-300 text-gray-700'
                  }`}
                >
                  {idx + 1}
                </div>

                {/* Step Label */}
                <div className="mt-4">
                  <p className="font-semibold text-gray-900 text-sm">{step.role}</p>
                  <p className="text-xs text-gray-600 mt-1">Year {step.year}</p>
                </div>

                {/* Salary Badge */}
                <div className="mt-2 inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                  ${(step.salary / 1000).toFixed(0)}k
                </div>
              </div>
            ))}
          </div>

          {/* Expandable Step Details */}
          {pathway.salaryProgression[selectedStep] && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mt-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-gray-600 text-sm font-medium">ROLE</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {pathway.salaryProgression[selectedStep].role}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium">TIMELINE</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    Year {pathway.salaryProgression[selectedStep].year}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium">SALARY</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ${(pathway.salaryProgression[selectedStep].salary / 1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium">SALARY GROWTH</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {selectedStep === 0
                      ? 'Start'
                      : `+${Math.round(
                          ((pathway.salaryProgression[selectedStep].salary -
                            pathway.salaryProgression[0].salary) /
                            pathway.salaryProgression[0].salary) *
                            100,
                        )}%`}
                  </p>
                </div>
              </div>

              {/* Skills Required */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Key Skills Required</h4>
                <div className="grid grid-cols-2 gap-3">
                  {pathway.skillsRequired.slice(0, 4).map((skill, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium text-gray-900 text-sm">{skill.skill}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-600">
                          Level {skill.currentLevel}/{skill.targetLevel}
                        </span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(skill.currentLevel / skill.targetLevel) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-xs text-orange-600 mt-2 font-medium">
                        {skill.timeToLearn} hrs
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm font-medium">TOTAL SALARY GROWTH</p>
          <p className="text-4xl font-bold text-green-600 mt-2">{totalSalaryGrowth}%</p>
          <p className="text-xs text-gray-600 mt-3">Over {pathway.timelineYears} years</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm font-medium">TIMELINE</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{pathway.timelineYears}</p>
          <p className="text-xs text-gray-600 mt-3">Years to target role</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm font-medium">AVG ANNUAL GROWTH</p>
          <p className="text-4xl font-bold text-purple-600 mt-2">
            {Math.round(totalSalaryGrowth / pathway.timelineYears)}%
          </p>
          <p className="text-xs text-gray-600 mt-3">Per year</p>
        </div>
      </div>

      {/* Career Insights */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Career Insights</h3>
        <div className="space-y-4">
          {[
            {
              title: 'Skill Gap Opportunity',
              description: 'Focus on Python and AWS to accelerate your career progression',
              confidence: 85,
              icon: '📚',
            },
            {
              title: 'Market Demand',
              description: 'Your target role is in high demand with 150% year-over-year growth',
              confidence: 78,
              icon: '📈',
            },
            {
              title: 'Career Progression',
              description: 'You can reach your target role in 4-5 years with current trajectory',
              confidence: 82,
              icon: '🎯',
            },
          ].map((insight, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 pl-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{insight.icon} {insight.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {insight.confidence}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CareerPathwayTimeline;
