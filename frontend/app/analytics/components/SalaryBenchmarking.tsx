'use client';

/**
 * Salary Benchmarking Component
 * Interactive salary range analysis and prediction
 */

import React, { useState } from 'react';
import { analyticsService } from '@/services/analytics/analyticsService';
import {
  SalaryBenchmark,
  SalaryPrediction,
  SalaryRange,
} from '@/types/analytics.types';

const JOB_ROLES = ['Software Engineer', 'Data Scientist', 'Product Manager', 'Designer', 'Manager'];
const EXPERIENCE_LEVELS = ['junior', 'mid', 'senior', 'lead'];
const LOCATIONS = ['New York', 'San Francisco', 'Austin', 'Remote', 'London'];
const SKILLS = ['Python', 'React', 'AWS', 'Machine Learning', 'SQL', 'Kubernetes', 'Leadership'];

export const SalaryBenchmarking: React.FC = () => {
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [experience, setExperience] = useState('mid');
  const [location, setLocation] = useState('San Francisco');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const [benchmark, setBenchmark] = useState<SalaryBenchmark | null>(null);
  const [prediction, setPrediction] = useState<SalaryPrediction | null>(null);
  const [range, setRange] = useState<SalaryRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);

      const [benchmarkData, rangeData, predictionData] = await Promise.all([
        analyticsService.getSalaryBenchmark(jobRole, experience, location),
        analyticsService.getSalaryRange(jobRole, experience, location),
        analyticsService.predictSalary(jobRole, experience, location, selectedSkills),
      ]);

      setBenchmark(benchmarkData);
      setRange(rangeData);
      setPrediction(predictionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze salary');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Salary Benchmarking</h1>
        <p className="text-gray-600 mt-1">Analyze salary ranges and predict fair compensation</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Search Parameters</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Job Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Role</label>
            <select
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {JOB_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Skills Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Additional Skills (optional for salary boost)
          </label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedSkills.includes(skill)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
          {selectedSkills.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Selected: {selectedSkills.join(', ')}
            </p>
          )}
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze Salary'}
        </button>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Results */}
      {range && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Salary Range Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Salary Range</h3>
            <div className="space-y-4">
              {/* Range Visualization */}
              <div className="relative h-16 bg-gradient-to-r from-green-100 to-green-50 rounded-lg p-4 flex items-center">
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-green-400 to-green-500 rounded-lg"
                  style={{
                    left: `${(range.min / range.max) * 100}%`,
                    right: `${100 - (range.max / range.max) * 100}%`,
                  }}
                />
                <div className="relative w-full flex justify-between px-2">
                  <span className="text-sm font-semibold text-gray-700">
                    ${Math.round(range.min / 1000)}K
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    ${Math.round(range.max / 1000)}K
                  </span>
                </div>
              </div>

              {/* Salary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium">MEDIAN</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${Math.round(range.median / 1000)}K
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium">AVERAGE</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${Math.round((range.min + range.max) / 2 / 1000)}K
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium">25TH PERCENTILE</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ${Math.round(range.percentile25 / 1000)}K
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium">75TH PERCENTILE</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${Math.round(range.percentile75 / 1000)}K
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Benchmark & Prediction Card */}
          <div className="space-y-6">
            {benchmark && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Market Benchmark</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <p className="text-gray-700">Trend</p>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        benchmark.trend === 'up'
                          ? 'bg-green-100 text-green-800'
                          : benchmark.trend === 'down'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {benchmark.trend.toUpperCase()} {Math.abs(benchmark.trendPercentage)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <p className="text-gray-700">Sample Size</p>
                    <p className="font-semibold text-gray-900">{benchmark.sampleSize} data points</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-700">Last Updated</p>
                    <p className="text-sm text-gray-600">
                      {new Date(benchmark.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {prediction && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Predicted Salary</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      ${Math.round(prediction.predictedSalary / 1000)}K
                    </p>
                    <p className="text-sm text-gray-600">
                      Confidence: {Math.round(prediction.confidence)}%
                    </p>
                  </div>

                  {/* Factors */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Salary Factors:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">Experience</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {(prediction.factors.experience * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">Location</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {(prediction.factors.location * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="bg-white rounded p-2 col-span-2">
                        <p className="text-xs text-gray-600">Skills Match</p>
                        <p className="text-sm font-semibold text-gray-900">
                          +{((prediction.factors.skillsMatch - 1) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
