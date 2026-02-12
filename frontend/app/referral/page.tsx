'use client';

import { useState } from 'react';
import { ReferralDashboard } from '@/components/ReferralDashboard';
import { RewardTracker } from '@/components/RewardTracker';
import { PayoutManagement } from '@/components/PayoutManagement';
import { ReferralInvitation } from '@/components/ReferralInvitation';
import { RewardMarketplace } from '@/components/RewardMarketplace';
import { CommunityFeed } from '@/components/CommunityFeed';
import { Share2, Gift, DollarSign, Users, ShoppingCart, MessageCircle } from 'lucide-react';

export default function ReferralPage() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'rewards' | 'payouts' | 'invitations' | 'marketplace' | 'community'
  >('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Share2 },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'payouts', label: 'Payouts', icon: DollarSign },
    { id: 'invitations', label: 'Invite', icon: Users },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
    { id: 'community', label: 'Community', icon: MessageCircle },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Referral & Community Hub</h1>
          <p className="text-xl text-gray-600">
            Earn rewards, build your network, and grow with our community
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-t-lg border border-gray-200 border-b-0 sticky top-0 z-10">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-4 whitespace-nowrap border-b-2 transition-all font-medium ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="animate-fadeIn">
              <ReferralDashboard userId="current" />
            </div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <div className="animate-fadeIn">
              <RewardTracker />
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="animate-fadeIn">
              <PayoutManagement />
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <div className="animate-fadeIn">
              <ReferralInvitation />
            </div>
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && (
            <div className="animate-fadeIn">
              <RewardMarketplace />
            </div>
          )}

          {/* Community Tab */}
          {activeTab === 'community' && (
            <div className="animate-fadeIn">
              <CommunityFeed />
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">💰 Earn More</h3>
            <p className="text-sm text-gray-600">
              Every successful referral earns you rewards. Withdraw to your preferred payment method anytime.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">🤝 Network</h3>
            <p className="text-sm text-gray-600">
              Connect with job seekers and employers. Share your experiences and help others succeed.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">⭐ Achieve</h3>
            <p className="text-sm text-gray-600">
              Climb the community ranks from Bronze to Platinum. Unlock exclusive perks and recognition.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
