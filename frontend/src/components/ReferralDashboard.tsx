import { useState, useEffect } from 'react';
import { referralService } from '@/services/referral.service';
import { Copy, Share2, TrendingUp } from 'lucide-react';

interface ReferralDashboardProps {
  userId: string;
}

export const ReferralDashboard: React.FC<ReferralDashboardProps> = ({ userId }) => {
  const [referral, setReferral] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [referralData, statsData] = await Promise.all([
        referralService.getReferrals(),
        referralService.getReferralStats(),
      ]);
      setReferral(referralData?.[0]);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async () => {
    try {
      const newReferral = await referralService.createReferral('dashboard', 'organic');
      setReferral(newReferral);
    } catch (error) {
      console.error('Failed to create referral:', error);
    }
  };

  const handleCopyLink = () => {
    if (referral?.referral_link) {
      navigator.clipboard.writeText(referral.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async (platform: 'email' | 'social' | 'link') => {
    try {
      await referralService.shareReferral(referral.id, platform);
      if (platform === 'link') {
        handleCopyLink();
      } else {
        // Handle social/email share through native APIs
        if (navigator.share && platform === 'social') {
          navigator.share({
            title: 'Join our Job Portal',
            text: 'Check out this amazing job platform!',
            url: referral.referral_link,
          });
        }
      }
    } catch (error) {
      console.error('Failed to share referral:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Referral Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Referral Link</h2>

        {referral ? (
          <div className="space-y-4">
            {/* Link Display */}
            <div className="bg-white rounded-lg p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Referral Link</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded text-gray-700 truncate">
                  {referral.referral_link}
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Copy link"
              >
                <Copy size={20} />
              </button>
            </div>

            {/* Referral Code */}
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Referral Code</p>
              <div className="flex items-center gap-2">
                <code className="text-lg font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded">
                  {referral.referral_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referral.referral_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleShare('link')}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Copy size={18} />
                Copy Link
              </button>
              <button
                onClick={() => handleShare('social')}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Share
              </button>
              <button
                onClick={() => handleShare('email')}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Email Invite
              </button>
            </div>

            {/* Status Info */}
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
              </span>
              <p className="text-xs text-gray-500 mt-2">
                Expires: {new Date(referral.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">You don't have a referral link yet</p>
            <button
              onClick={handleCreateReferral}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Referral Link
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          {/* Active */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Share your unique referral link with friends and colleagues</li>
          <li>✓ Earn rewards when they join and complete their first job application</li>
          <li>✓ Unlock premium access with enough successful referrals</li>
          <li>✓ Cash out your earnings with flexible payout options</li>
        </ul>
      </div>
    </div>
  );
};
