import { useState, useEffect } from 'react';
import { referralService } from '@/services/referral.service';
import { ShoppingCart, Star, CheckCircle, Filter } from 'lucide-react';

interface RewardItem {
  id: string;
  name: string;
  type: 'credit' | 'discount' | 'premium-access' | 'bonus';
  value: number;
  description: string;
  category: string;
  available: boolean;
  rating?: number;
  savings?: number;
}

export const RewardMarketplace: React.FC = () => {
  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<RewardItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', label: 'All Rewards' },
    { id: 'credit', label: 'Account Credit' },
    { id: 'discount', label: 'Discounts' },
    { id: 'premium', label: 'Premium Access' },
    { id: 'features', label: 'Features' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRewards();
  }, [selectedCategory, rewards]);

  const loadData = async () => {
    try {
      setLoading(true);
      const balanceData = await referralService.getRewardBalance();
      const rewardsData = await referralService.getRewards();
      setBalance(balanceData?.total || 0);
      setRewards(
        (rewardsData || []).map((reward: any) => ({
          id: reward.id,
          name:
            reward.reward_type === 'credit'
              ? `$${Number(reward.amount || 0).toFixed(2)} Account Credit`
              : reward.description || 'Reward',
          type: reward.reward_type || 'bonus',
          value: Number(reward.amount || 0),
          description: reward.description || 'Referral reward',
          category:
            reward.reward_type === 'premium-access'
              ? 'premium'
              : reward.reward_type === 'bonus'
                ? 'features'
                : reward.reward_type,
          available: reward.status === 'earned',
          savings: Number(reward.amount || 0),
        }))
      );
    } catch (error) {
      console.error('Failed to load reward data:', error);
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRewards = () => {
    if (selectedCategory === 'all') {
      setFilteredRewards(rewards);
    } else {
      setFilteredRewards(rewards.filter((r) => r.type === selectedCategory || r.category === selectedCategory));
    }
  };

  const handleRedeem = async (rewardId: string) => {
    try {
      setRedeeming(rewardId);
      await referralService.redeemReward(rewardId);
      alert('Reward redeemed successfully!');
      await loadData();
    } catch (error) {
      console.error('Failed to redeem reward:', error);
    } finally {
      setRedeeming(null);
    }
  };

  const getRewardTypeColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'from-blue-500 to-cyan-500';
      case 'discount':
        return 'from-purple-500 to-pink-500';
      case 'premium-access':
        return 'from-amber-500 to-orange-500';
      case 'bonus':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return '💳';
      case 'discount':
        return '🏷️';
      case 'premium-access':
        return '✨';
      case 'bonus':
        return '🎁';
      default:
        return '⭐';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6">
        <p className="text-indigo-100 text-sm font-medium mb-1">Available Balance</p>
        <div className="flex items-center justify-between">
          <div className="text-4xl font-bold">${balance.toFixed(2)}</div>
          <div className="text-right">
            <p className="text-indigo-100 text-sm">Ready to redeem</p>
            <p className="text-lg font-semibold">{filteredRewards.length} rewards available</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors font-medium ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      {filteredRewards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ShoppingCart size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No rewards in this category</p>
          <p className="text-sm text-gray-500">Try another filter or check back later</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
            >
              {/* Header with gradient */}
              <div className={`h-24 bg-gradient-to-br ${getRewardTypeColor(reward.type)} p-4 flex items-end`}>
                <span className="text-4xl">{getRewardTypeIcon(reward.type)}</span>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">{reward.name}</h3>
                  <p className="text-sm text-gray-600">{reward.description}</p>
                </div>

                {/* Rating */}
                {reward.rating && (
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < Math.floor(reward.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">({reward.rating})</span>
                  </div>
                )}

                {/* Savings Badge */}
                {reward.savings && (
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-sm font-semibold text-green-700">Save ${reward.savings}</p>
                  </div>
                )}

                {/* Redeem Button */}
                <button
                  onClick={() => handleRedeem(reward.id)}
                  disabled={redeeming === reward.id || !reward.available}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    reward.available
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {redeeming === reward.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Redeeming...
                    </>
                  ) : !reward.available ? (
                    <>
                      <CheckCircle size={18} />
                      Redeemed
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={18} />
                      Redeem Now
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips Card */}
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <h3 className="font-semibold text-purple-900 mb-2">🎯 Maximize Your Rewards</h3>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>✓ Redeem high-value items first for maximum savings</li>
          <li>✓ Premium access unlocks exclusive networking features</li>
          <li>✓ Account credit can be used for any premium service</li>
          <li>✓ Check back weekly for limited-time special offers</li>
        </ul>
      </div>
    </div>
  );
};
