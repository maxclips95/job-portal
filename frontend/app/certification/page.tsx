/**
 * Certification Hub Page
 * Main page for assessments, certifications, portfolio, and endorsements
 */

'use client';

import React, { useState } from 'react';
import { AssessmentTaker } from './components/AssessmentTaker';
import { CertificationDisplay } from './components/CertificationDisplay';
import { PortfolioBuilder } from './components/PortfolioBuilder';
import { BadgeShowcase } from './components/BadgeShowcase';
import { SkillEndorsement } from './components/SkillEndorsement';

type TabType = 'assessments' | 'certificates' | 'portfolio' | 'badges' | 'endorsements';

export default function CertificationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('certificates');
  const [showAssessmentTaker, setShowAssessmentTaker] = useState(false);

  // Mock data - in real implementation, fetch from API
  const mockCertifications = [
    {
      id: 'cert-1',
      skillId: 'skill-1',
      level: 'professional',
      earnedDate: new Date('2024-01-15'),
      expiryDate: new Date('2026-01-15'),
      credentialUrl: 'https://credentials.example.com/cert-1',
      status: 'earned',
    },
    {
      id: 'cert-2',
      skillId: 'skill-2',
      level: 'expert',
      earnedDate: new Date('2023-09-20'),
      expiryDate: new Date('2026-09-20'),
      credentialUrl: 'https://credentials.example.com/cert-2',
      status: 'earned',
    },
  ];

  const mockPortfolio = {
    title: 'John Developer Portfolio',
    bio: 'Full-stack developer passionate about building scalable applications.',
    items: [
      {
        id: 'item-1',
        type: 'project',
        title: 'E-Commerce Platform',
        description: 'Built a full-stack e-commerce platform with React and Node.js',
        skills: ['React', 'Node.js', 'PostgreSQL'],
        links: {
          live: 'https://example.com',
          github: 'https://github.com/example',
        },
      },
    ],
    published: false,
  };

  const mockBadges = [
    {
      id: 'badge-1',
      name: 'React Master',
      description: 'Advanced React development skills',
      icon: '⚛️',
      color: '#61DAFB',
      level: 'professional',
    },
    {
      id: 'badge-2',
      name: 'TypeScript Pro',
      description: 'TypeScript mastery and advanced typing',
      icon: '📘',
      color: '#3178C6',
      level: 'expert',
    },
    {
      id: 'badge-3',
      name: 'Node.js Expert',
      description: 'Backend development with Node.js',
      icon: '🟢',
      color: '#68A063',
      level: 'professional',
    },
  ];

  const mockEndorsements = [
    {
      id: 'endorsement-1',
      skillId: 'skill-1',
      skillName: 'React',
      endorsedBy: 'Jane Smith',
      level: 'expert',
      message: 'Great React developer with deep knowledge of hooks and performance',
      endorsementDate: new Date('2024-02-10'),
    },
    {
      id: 'endorsement-2',
      skillId: 'skill-2',
      skillName: 'TypeScript',
      endorsedBy: 'Bob Johnson',
      level: 'advanced',
      endorsementDate: new Date('2024-01-20'),
    },
  ];

  const handleAssessmentSubmit = (answers: Record<string, string>) => {
    console.log('Assessment submitted:', answers);
    setShowAssessmentTaker(false);
    // Show result notification
  };

  const mockQuestions = [
    {
      id: 'q1',
      type: 'multiple-choice',
      content: 'What is the primary purpose of the useEffect hook?',
      options: [
        'To manage component state',
        'To handle side effects in functional components',
        'To optimize performance',
        'To manage context',
      ],
      points: 10,
    },
    {
      id: 'q2',
      type: 'true-false',
      content: 'TypeScript requires all variables to be explicitly typed.',
      options: ['True', 'False'],
      points: 5,
    },
  ];

  if (showAssessmentTaker) {
    return (
      <AssessmentTaker
        assessmentId="assessment-1"
        questions={mockQuestions}
        durationMinutes={30}
        onSubmit={handleAssessmentSubmit}
        onCancel={() => setShowAssessmentTaker(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">🎓 Certification Hub</h1>
          <p className="text-blue-100">
            Earn certifications, build your portfolio, and showcase your skills
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'assessments', label: '📝 Assessments', icon: '📝' },
              { id: 'certificates', label: '🏆 Certificates', icon: '🏆' },
              { id: 'portfolio', label: '📁 Portfolio', icon: '📁' },
              { id: 'badges', label: '🎖️ Badges', icon: '🎖️' },
              { id: 'endorsements', label: '⭐ Endorsements', icon: '⭐' },
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-4">Available Assessments</h2>
              <p className="text-gray-600 mb-6">
                Take assessments to earn certifications and badges in your skills.
              </p>

              <div className="grid gap-4">
                {[
                  { id: 'a1', name: 'React Fundamentals', difficulty: 'Beginner', duration: 45 },
                  { id: 'a2', name: 'Advanced TypeScript', difficulty: 'Expert', duration: 60 },
                  { id: 'a3', name: 'Node.js Backend', difficulty: 'Intermediate', duration: 50 },
                ].map((assessment) => (
                  <div
                    key={assessment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{assessment.name}</h3>
                        <p className="text-sm text-gray-600">
                          {assessment.difficulty} • {assessment.duration} minutes
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAssessmentTaker(true)}
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
            certifications={mockCertifications}
            onShare={(certId) => console.log('Share:', certId)}
            onRenew={(certId) => console.log('Renew:', certId)}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioBuilder
            portfolio={mockPortfolio}
            onAddItem={(item) => console.log('Add:', item)}
            onUpdateItem={(id, item) => console.log('Update:', id, item)}
            onRemoveItem={(id) => console.log('Remove:', id)}
            onPublish={() => console.log('Publish')}
            onUpdatePortfolio={(data) => console.log('Update portfolio:', data)}
          />
        )}

        {activeTab === 'badges' && (
          <BadgeShowcase
            badges={mockBadges}
            earnedBadges={['badge-1']}
            onCheckProgress={(badgeId) => console.log('Check progress:', badgeId)}
          />
        )}

        {activeTab === 'endorsements' && (
          <SkillEndorsement
            endorsements={mockEndorsements}
            trustScore={72}
            totalEndorsements={5}
            onAddEndorsement={(skillId, message) =>
              console.log('Add endorsement:', skillId, message)
            }
            onRemoveEndorsement={(id) => console.log('Remove:', id)}
          />
        )}
      </div>
    </div>
  );
}
