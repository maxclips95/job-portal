'use client';

import React, { useState } from 'react';
import { aiService } from '@/services/ai.service';
import { Loader, BookOpen, PenTool, TrendingUp, Brain, DollarSign } from 'lucide-react';
import ResumeAnalyzer from '@/components/ai/ResumeAnalyzer';

type ToolTab = 'resume' | 'interview' | 'cover-letter' | 'skills' | 'salary';

export default function AIToolsPage() {
  const [activeTab, setActiveTab] = useState<ToolTab>('resume');
  const [jobId, setJobId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkills, setCurrentSkills] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior' | 'lead'>('mid');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInterview = async () => {
    if (!jobId) {
      setError('Please enter a Job ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const questions = await aiService.generateInterviewQuestions(jobId);
      setResult({ questions });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobId || !candidateName || !companyName) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const coverLetter = await aiService.generateCoverLetter(
        jobId,
        candidateName,
        companyName,
        skills
      );
      setResult({ coverLetter });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSkillRecommendations = async () => {
    if (!jobId) {
      setError('Please enter a Job ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const recommendations = await aiService.getSkillRecommendations(jobId, currentSkills);
      setResult({ recommendations });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictSalary = async () => {
    if (!location || skills.length === 0) {
      setError('Please enter location and add skills');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const salary = await aiService.predictSalary(skills, experienceLevel, location);
      setResult({ salary });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Career Tools</h1>
          <p className="text-gray-600">Free AI-powered tools to boost your job search</p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
          <button
            onClick={() => setActiveTab('resume')}
            className={`p-3 rounded-lg font-medium transition ${
              activeTab === 'resume'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="h-5 w-5 mx-auto mb-1" />
            Resume
          </button>
          <button
            onClick={() => setActiveTab('interview')}
            className={`p-3 rounded-lg font-medium transition ${
              activeTab === 'interview'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Brain className="h-5 w-5 mx-auto mb-1" />
            Interview
          </button>
          <button
            onClick={() => setActiveTab('cover-letter')}
            className={`p-3 rounded-lg font-medium transition ${
              activeTab === 'cover-letter'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <PenTool className="h-5 w-5 mx-auto mb-1" />
            Letter
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`p-3 rounded-lg font-medium transition ${
              activeTab === 'skills'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="h-5 w-5 mx-auto mb-1" />
            Skills
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`p-3 rounded-lg font-medium transition ${
              activeTab === 'salary'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <DollarSign className="h-5 w-5 mx-auto mb-1" />
            Salary
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Resume Analyzer */}
          {activeTab === 'resume' && <ResumeAnalyzer />}

          {/* Interview Prep */}
          {activeTab === 'interview' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Job ID"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleGenerateInterview}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                Generate Interview Questions
              </button>
              {error && <p className="text-red-600">{error}</p>}
              {result?.questions && (
                <div className="space-y-3 mt-6">
                  <h3 className="font-semibold">Interview Questions:</h3>
                  {result.questions.map((q: string, idx: number) => (
                    <div key={idx} className="p-4 bg-gray-100 rounded">
                      <p className="font-medium text-gray-900">{idx + 1}. {q}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cover Letter */}
          {activeTab === 'cover-letter' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Job ID"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Your Name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleGenerateCoverLetter}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                Generate Cover Letter
              </button>
              {error && <p className="text-red-600">{error}</p>}
              {result?.coverLetter && (
                <div className="p-4 bg-gray-100 rounded whitespace-pre-wrap text-sm">
                  {result.coverLetter}
                </div>
              )}
            </div>
          )}

          {/* Skills */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Job ID"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleGetSkillRecommendations}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                Get Recommendations
              </button>
              {error && <p className="text-red-600">{error}</p>}
              {result?.recommendations && (
                <div className="space-y-2 mt-6">
                  <h3 className="font-semibold">Recommended Skills:</h3>
                  {result.recommendations.map((skill: string, idx: number) => (
                    <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded">
                      {skill}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Salary */}
          {activeTab === 'salary' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Location (e.g., San Francisco)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
              </select>
              <button
                onClick={handlePredictSalary}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                Predict Salary
              </button>
              {error && <p className="text-red-600">{error}</p>}
              {result?.salary && (
                <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-green-700 mb-2">Estimated Salary Range</p>
                  <p className="text-3xl font-bold text-green-900">
                    ${result.salary.min.toLocaleString()} - ${result.salary.max.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-700 mt-2">{result.salary.currency}/year</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
