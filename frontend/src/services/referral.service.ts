import axios from 'axios';

const API_BASE = '/api/referral';

export const referralService = {
  // === Referral Management ===
  async createReferral(source?: string, campaign?: string) {
    const { data } = await axios.post(`${API_BASE}/create`, { source, campaign });
    return data;
  },

  async getReferrals(filters?: any) {
    const { data } = await axios.get(`${API_BASE}/list`, { params: filters });
    return data;
  },

  async getReferral(id: string) {
    const { data } = await axios.get(`${API_BASE}/${id}`);
    return data;
  },

  async acceptReferral(referralCode: string) {
    const { data } = await axios.post(`${API_BASE}/accept`, { referralCode });
    return data;
  },

  async shareReferral(id: string, platform: 'email' | 'social' | 'link') {
    const { data } = await axios.post(`${API_BASE}/${id}/share`, { platform });
    return data;
  },

  async getReferralStats() {
    const { data } = await axios.get(`${API_BASE}/stats`);
    return data;
  },

  // === Reward Management ===
  async getRewards() {
    const { data } = await axios.get(`${API_BASE}/rewards`);
    return data;
  },

  async redeemReward(rewardId: string) {
    const { data } = await axios.post(`${API_BASE}/rewards/${rewardId}/redeem`);
    return data;
  },

  async getRewardBalance() {
    const { data } = await axios.get(`${API_BASE}/rewards/balance`);
    return data;
  },

  // === Payment Methods ===
  async addPaymentMethod(method: string, details: any) {
    const { data } = await axios.post(`${API_BASE}/payment-methods`, { method, details });
    return data;
  },

  async getPaymentMethods() {
    const { data } = await axios.get(`${API_BASE}/payment-methods`);
    return data;
  },

  async updatePaymentMethod(id: string, isPrimary: boolean) {
    const { data } = await axios.patch(`${API_BASE}/payment-methods/${id}`, { isPrimary });
    return data;
  },

  async deletePaymentMethod(id: string) {
    await axios.delete(`${API_BASE}/payment-methods/${id}`);
  },

  async verifyPaymentMethod(id: string) {
    const { data } = await axios.post(`${API_BASE}/payment-methods/${id}/verify`);
    return data;
  },

  // === Payouts ===
  async requestPayout(paymentMethodId: string, amount: number, frequency: string, rewardIds?: string[]) {
    const { data } = await axios.post(`${API_BASE}/payouts`, {
      paymentMethodId,
      amount,
      frequency,
      rewardIds,
    });
    return data;
  },

  async getPayouts() {
    const { data } = await axios.get(`${API_BASE}/payouts`);
    return data;
  },

  async getPayout(id: string) {
    const { data } = await axios.get(`${API_BASE}/payouts/${id}`);
    return data;
  },

  // === Community Posts ===
  async createPost(type: string, title: string, content: string, tags?: string[]) {
    const { data } = await axios.post(`${API_BASE}/posts`, { type, title, content, tags });
    return data;
  },

  async getPosts(filters?: any) {
    const { data } = await axios.get(`${API_BASE}/posts`, { params: filters });
    return data;
  },

  async getPost(id: string) {
    const { data } = await axios.get(`${API_BASE}/posts/${id}`);
    return data;
  },

  async likePost(postId: string) {
    const { data } = await axios.post(`${API_BASE}/posts/${postId}/like`);
    return data;
  },

  async unlikePost(postId: string) {
    const { data } = await axios.delete(`${API_BASE}/posts/${postId}/like`);
    return data;
  },

  // === Comments ===
  async createComment(postId: string, content: string) {
    const { data } = await axios.post(`${API_BASE}/posts/${postId}/comments`, { content });
    return data;
  },

  async getComments(postId: string) {
    const { data } = await axios.get(`${API_BASE}/posts/${postId}/comments`);
    return data;
  },

  async likeComment(commentId: string) {
    const { data } = await axios.post(`${API_BASE}/comments/${commentId}/like`);
    return data;
  },

  // === Contributions & Gamification ===
  async logContribution(type: string, title: string, description?: string) {
    const { data } = await axios.post(`${API_BASE}/contributions`, { type, title, description });
    return data;
  },

  async getContributions() {
    const { data } = await axios.get(`${API_BASE}/contributions`);
    return data;
  },

  async getLeaderboard() {
    const { data } = await axios.get(`${API_BASE}/leaderboard`);
    return data;
  },

  async getMemberProfile() {
    const { data } = await axios.get(`${API_BASE}/member`);
    return data;
  },

  // === Analytics ===
  async getReferralAnalytics() {
    const { data } = await axios.get(`${API_BASE}/analytics/referrals`);
    return data;
  },

  async getPayoutAnalytics() {
    const { data } = await axios.get(`${API_BASE}/analytics/payouts`);
    return data;
  },

  async getCommunityAnalytics() {
    const { data } = await axios.get(`${API_BASE}/analytics/community`);
    return data;
  },
};
