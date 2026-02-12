import { useState, useEffect } from 'react';
import { referralService } from '@/services/referral.service';
import { Gift, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface Reward {
  id: string;
  reward_type: string;
  amount: number;
  currency: string;
  status: string;
  earned_at: string;
  redeemed_at?: string;
  expires_at?: string;
  description?: string;
}

export const RewardTracker: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const [rewardsData, balanceData] = await Promise.all([
        referralService.getRewards(),
        referralService.getRewardBalance(),
      ]);
      setRewards(rewardsData || []);
      setBalance(balanceData?.total || 0);
    } catch (error) {
      console.error('Failed to load rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    try {
      setRedeeming(rewardId);
      await referralService.redeemReward(rewardId);
      await loadRewards();
    } catch (error) {
      console.error('Failed to redeem reward:', error);
    } finally {
      setRedeeming(null);
    }
  };

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <Gift className="text-blue-600" size={20} />;
      case 'bonus-credits':
        return <TrendingUp className="text-green-600" size={20} />;
      case 'discount':
        return <Gift className="text-purple-600" size={20} />;
      case 'premium-access':
        return <Gift className="text-amber-600" size={20} />;
      default:
        return <Gift className="text-gray-600" size={20} />;
    }
  };

  const getRewardTypeLabel = (type: string) => {
    return type
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'earned':
        return 'bg-blue-100 text-blue-800';
      case 'redeemed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <h2 className="text-sm font-medium text-green-600 mb-2">Total Reward Balance</h2>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-green-900">${balance.toFixed(2)}</div>
          <div className="flex-1">
            <p className="text-sm text-green-700 mb-2">Ready to cash out or redeem for perks</p>
            <button className="text-sm font-medium text-green-600 hover:text-green-700 underline">
              View payout options →
            </button>
          </div>
          <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
            <TrendingUp className="text-green-700" size={32} />
          </div>
        </div>
      </div>

      {/* Rewards List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Rewards</h3>

        {rewards.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Gift size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No rewards yet</p>
            <p className="text-sm text-gray-500">
              Refer friends and colleagues to start earning rewards
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Side - Icon & Type */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {getRewardTypeIcon(reward.reward_type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {getRewardTypeLabel(reward.reward_type)}
                        </h4>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(reward.status)}`}>
                          {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          Earned: {new Date(reward.earned_at).toLocaleDateString()}
                        </div>
                        {reward.expires_at && (
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            Expires: {new Date(reward.expires_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {reward.description && <p className="text-sm text-gray-700 mt-2">{reward.description}</p>}
                    </div>
                  </div>

                  {/* Right Side - Amount & Action */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      {reward.reward_type === 'discount' ? `${reward.amount}%` : `$${reward.amount.toFixed(2)}`}
                    </p>

                    {reward.status === 'earned' && (
                      <button
                        onClick={() => handleRedeemReward(reward.id)}
                        disabled={redeeming === reward.id}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
                      >
                        {redeeming === reward.id ? 'Redeeming...' : 'Redeem'}
                      </button>
                    )}

                    {reward.status === 'redeemed' && (
                      <div className="flex items-center justify-center gap-1 text-green-600 text-sm font-medium">
                        <CheckCircle size={16} />
                        Redeemed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reward Tiers Info */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">Reward Tiers</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex justify-between">
            <span>1 Successful Referral:</span>
            <span className="font-semibold">$5 Credit</span>
          </div>
          <div className="flex justify-between">
            <span>3 Successful Referrals:</span>
            <span className="font-semibold">$20 Bonus + 15% Discount</span>
          </div>
          <div className="flex justify-between">
            <span>10 Successful Referrals:</span>
            <span className="font-semibold">Premium Access (30 days)</span>
          </div>
          <div className="flex justify-between">
            <span>25+ Successful Referrals:</span>
            <span className="font-semibold">Lifetime Premium</span>
          </div>
        </div>
      </div>
    </div>
  );
};
