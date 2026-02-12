'use client';

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AssessmentTaker } from './components/AssessmentTaker';
import { CertificationDisplay } from './components/CertificationDisplay';
import { PortfolioBuilder } from './components/PortfolioBuilder';
import { BadgeShowcase } from './components/BadgeShowcase';
import { SkillEndorsement } from './components/SkillEndorsement';

type TabType = 'assessments' | 'certificates' | 'portfolio' | 'badges' | 'endorsements';

type OverviewResponse = {
  assessments: Array<{
    id: string;
    skillId: string;
    name: string;
    description: string;
    difficulty: string;
    duration: number;
    passingScore: number;
  }>;
  certifications: Array<{
    id: string;
    skillId: string;
    level: string;
    earnedDate: string;
    expiryDate?: string;
    credentialUrl: string;
    status: string;
    verificationToken: string;
  }>;
  portfolio: {
    id: string;
    title: string;
    bio: string;
    items: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      skills: string[];
      links?: Record<string, string>;
    }>;
    published: boolean;
  };
  badges: Array<{
    id: string;
    skillId: string;
    skillName: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    level: string;
  }>;
  earnedBadgeIds: string[];
  endorsements: Array<{
    id: string;
    skillId: string;
    skillName: string;
    endorsedBy: string;
    level: string;
    message?: string;
    endorsementDate: string;
  }>;
  trustScore: number;
  totalEndorsements: number;
};

export default function CertificationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('certificates');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [assessmentQuestions, setAssessmentQuestions] = useState<any[]>([]);
  const [assessmentDuration, setAssessmentDuration] = useState<number>(30);

  const api = axios.create({ baseURL: '/api/certification' });

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<OverviewResponse>('/overview');
      setOverview(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load certification data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const availableSkills = useMemo(() => {
    const badgeSkills = (overview?.badges || []).map((b) => ({ id: b.skillId, name: b.skillName }));
    const unique = new Map<string, string>();
    for (const skill of badgeSkills) {
      if (!unique.has(skill.id)) unique.set(skill.id, skill.name);
    }
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [overview]);

  const startAssessment = async (assessmentId: string) => {
    try {
      const { data } = await api.post(`/assessments/${assessmentId}/start`);
      setCurrentAttemptId(data.attemptId);
      setCurrentAssessmentId(assessmentId);
      setAssessmentQuestions(data.questions || []);
      setAssessmentDuration(Number(data.durationMinutes || 30));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to start assessment');
    }
  };

  const handleAssessmentSubmit = async (answers: Record<string, string>) => {
    if (!currentAttemptId) return;
    try {
      const { data } = await api.post(`/assessments/attempts/${currentAttemptId}/submit`, { answers });
      alert(`Assessment submitted. Score: ${data.score}. ${data.isPassed ? 'Passed' : 'Not passed'}.`);
      setCurrentAttemptId(null);
      setCurrentAssessmentId(null);
      setAssessmentQuestions([]);
      await loadOverview();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit assessment');
    }
  };

  const handleShare = async (certId: string) => {
    try {
      const { data } = await api.post(`/certifications/${certId}/share`);
      await navigator.clipboard.writeText(data.shareUrl);
      alert('Share link copied to clipboard');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to share certification');
    }
  };

  const handleUpdatePortfolio = async (payload: any) => {
    try {
      await api.put('/users/me/portfolio', payload);
      await loadOverview();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update portfolio');
    }
  };

  const handleAddPortfolioItem = async (item: any) => {
    if (!overview?.portfolio?.id) return;
    try {
      await api.post(`/portfolios/${overview.portfolio.id}/items`, item);
      await loadOverview();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add portfolio item');
    }
  };

  const handleRemovePortfolioItem = async (itemId: string) => {
    if (!overview?.portfolio?.id) return;
    try {
      await api.delete(`/portfolios/${overview.portfolio.id}/items/${itemId}`);
      await loadOverview();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove portfolio item');
    }
  };

  const handlePublishPortfolio = async () => {
    if (!overview?.portfolio?.id) return;
    try {
      await api.post(`/portfolios/${overview.portfolio.id}/publish`);
      await loadOverview();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to publish portfolio');
    }
  };

  const handleBadgeProgress = async (badgeId: string) => {
    const { data } = await api.get(`/badges/${badgeId}/progress`);
    return data?.details || null;
  };

  const handleAddEndorsement = async (skillId: string, message?: string) => {
    try {
      await api.post(`/users/me/skills/${skillId}/endorse`, { message });
      await loadOverview();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add endorsement');
    }
  };

  const handleRemoveEndorsement = async (endorsementId: string) => {
    try {
      await api.delete(`/endorsements/${endorsementId}`);
      await loadOverview();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove endorsement');
    }
  };

  if (currentAttemptId && currentAssessmentId) {
    return (
      <AssessmentTaker
        assessmentId={currentAssessmentId}
        questions={assessmentQuestions}
        durationMinutes={assessmentDuration}
        onSubmit={handleAssessmentSubmit}
        onCancel={() => {
          setCurrentAttemptId(null);
          setCurrentAssessmentId(null);
          setAssessmentQuestions([]);
        }}
      />
    );
  }

  if (loading) {
    return <div className="p-8">Loading certification hub...</div>;
  }

  if (error || !overview) {
    return <div className="p-8 text-red-600">{error || 'Unable to load certification hub'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Certification Hub</h1>
          <p className="text-blue-100">Earn certifications, build your portfolio, and showcase your skills.</p>
        </div>
      </div>

      <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'assessments', label: 'Assessments' },
              { id: 'certificates', label: 'Certificates' },
              { id: 'portfolio', label: 'Portfolio' },
              { id: 'badges', label: 'Badges' },
              { id: 'endorsements', label: 'Endorsements' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-4 font-semibold border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-4">Available Assessments</h2>
              <p className="text-gray-600 mb-6">Take assessments to earn certifications and badges in your skills.</p>

              <div className="grid gap-4">
                {overview.assessments.map((assessment) => (
                  <div key={assessment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{assessment.name}</h3>
                        <p className="text-sm text-gray-600">
                          {assessment.difficulty} • {assessment.duration} minutes • Pass {assessment.passingScore}%
                        </p>
                      </div>
                      <button
                        onClick={() => startAssessment(assessment.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                      >
                        Start Assessment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'certificates' && (
          <CertificationDisplay
            certifications={overview.certifications as any}
            onShare={handleShare}
            onRenew={() => {}}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioBuilder
            portfolio={overview.portfolio as any}
            availableSkills={availableSkills.map((s) => s.name)}
            onAddItem={handleAddPortfolioItem}
            onUpdateItem={() => {}}
            onRemoveItem={handleRemovePortfolioItem}
            onPublish={handlePublishPortfolio}
            onUpdatePortfolio={handleUpdatePortfolio}
          />
        )}

        {activeTab === 'badges' && (
          <BadgeShowcase
            badges={overview.badges as any}
            earnedBadges={overview.earnedBadgeIds}
            onCheckProgress={handleBadgeProgress}
          />
        )}

        {activeTab === 'endorsements' && (
          <SkillEndorsement
            endorsements={overview.endorsements as any}
            trustScore={overview.trustScore}
            totalEndorsements={overview.totalEndorsements}
            availableSkills={availableSkills}
            onAddEndorsement={handleAddEndorsement}
            onRemoveEndorsement={handleRemoveEndorsement}
          />
        )}
      </div>
    </div>
  );
}
