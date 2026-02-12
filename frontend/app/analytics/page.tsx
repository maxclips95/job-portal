'use client';

/**
 * Analytics Page
 * Main page for market analytics with tab navigation
 */

import React, { useState } from 'react';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SalaryBenchmarking } from './components/SalaryBenchmarking';
import { SkillTrendAnalyzer } from './components/SkillTrendAnalyzer';
import { CustomReportBuilder } from './components/CustomReportBuilder';
import { MarketInsights } from './components/MarketInsights';

type TabType = 'dashboard' | 'salary' | 'skills' | 'insights' | 'reports';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'salary', label: 'Salary', icon: '💰' },
  { id: 'skills', label: 'Skills', icon: '🎯' },
  { id: 'insights', label: 'Insights', icon: '💡' },
  { id: 'reports', label: 'Reports', icon: '📄' },
];

export default function AnalyticsPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AnalyticsDashboard />;
      case 'salary':
        return <SalaryBenchmarking />;
      case 'skills':
        return <SkillTrendAnalyzer />;
      case 'insights':
        return <MarketInsights />;
      case 'reports':
        return <CustomReportBuilder />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Job Portal Analytics</h1>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}
