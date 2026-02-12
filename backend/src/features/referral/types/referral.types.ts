/**
 * Referral & Community Types
 * Type definitions for referral system with rewards, payments, and social features
 */

// ============================================================
// Referral Types
// ============================================================

export type ReferralStatus = 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
export type ReferralRewardType = 'credit' | 'bonus-credits' | 'discount' | 'premium-access';
export type RewardStatus = 'pending' | 'earned' | 'redeemed' | 'expired';

export interface Referral {
  id: string;
  referrerId: string;
  refereeId?: string;
  referralCode: string;
  referralLink: string;
  status: ReferralStatus;
  createdAt: Date;
  acceptedAt?: Date;
  expiresAt: Date;
  metadata: {
    source?: string;
    campaign?: string;
    notes?: string;
  };
}

export interface Reward {
  id: string;
  referralId: string;
  userId: string;
  rewardType: ReferralRewardType;
  amount: number;
  currency: string;
  status: RewardStatus;
  earnedAt: Date;
  redeemedAt?: Date;
  expiresAt: Date;
  description: string;
}

// ============================================================
// Payment & Payout Types
// ============================================================

export type PaymentMethod = 'credit-card' | 'bank-transfer' | 'paypal' | 'stripe';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PayoutFrequency = 'weekly' | 'monthly' | 'quarterly' | 'on-demand';

export interface PaymentInfo {
  id: string;
  userId: string;
  method: PaymentMethod;
  stripePaymentMethodId?: string;
  bankDetails?: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
  };
  paypalEmail?: string;
  isVerified: boolean;
  primary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payout {
  id: string;
  userId: string;
  paymentInfoId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  frequency: PayoutFrequency;
  rewardIds: string[];
  stripePayoutId?: string;
  requestedAt: Date;
  completedAt?: Date;
  failureReason?: string;
  metadata: Record<string, any>;
}

// ============================================================
// Community & Social Types
// ============================================================

export type ContributionType = 'post' | 'comment' | 'resource' | 'mentoring' | 'event';
export type PostType = 'discussion' | 'question' | 'resource' | 'job-tip' | 'success-story';

export interface CommunityPost {
  id: string;
  userId: string;
  type: PostType;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
  likedByUser: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  likes: number;
  replies: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contribution {
  id: string;
  userId: string;
  type: ContributionType;
  referenceId?: string;
  title: string;
  description?: string;
  pointsEarned: number;
  createdAt: Date;
}

export interface CommunityMember {
  id: string;
  userId: string;
  joinedAt: Date;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalContributions: number;
  totalPoints: number;
  helpfulCount: number;
  followers: number;
  following: number;
  badges: string[];
  verified: boolean;
}

// ============================================================
// Analytics & Reporting Types
// ============================================================

export interface ReferralAnalytics {
  totalReferrals: number;
  activeReferrals: number;
  completedReferrals: number;
  conversionRate: number;
  avgDaysToConversion: number;
  revenueFromReferrals: number;
  topReferrers: {
    userId: string;
    referralCount: number;
    revenueGenerated: number;
  }[];
  referralTrend: {
    date: string;
    newReferrals: number;
    conversions: number;
  }[];
}

export interface PayoutAnalytics {
  totalPayout: number;
  pendingPayout: number;
  processedPayout: number;
  failedPayout: number;
  avgPayoutAmount: number;
  payoutsByFrequency: Record<PayoutFrequency, number>;
  payoutsByMethod: Record<PaymentMethod, number>;
}

export interface CommunityAnalytics {
  totalMembers: number;
  activeMembersThisMonth: number;
  totalPosts: number;
  avgEngagementRate: number;
  topContributors: {
    userId: string;
    contributions: number;
    points: number;
  }[];
  postTrend: {
    date: string;
    newPosts: number;
    engagement: number;
  }[];
}

// ============================================================
// Request/Response DTOs
// ============================================================

export interface CreateReferralRequest {
  source?: string;
  campaign?: string;
}

export interface AcceptReferralRequest {
  referralCode: string;
  email?: string;
}

export interface CreateRewardRequest {
  referralId: string;
  rewardType: ReferralRewardType;
  amount: number;
}

export interface CreatePaymentInfoRequest {
  method: PaymentMethod;
  stripePaymentMethodId?: string;
  bankDetails?: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
  };
  paypalEmail?: string;
  primary: boolean;
}

export interface RequestPayoutRequest {
  paymentInfoId: string;
  frequency: PayoutFrequency;
  rewardIds?: string[];
}

export interface CreatePostRequest {
  type: PostType;
  title: string;
  content: string;
  tags: string[];
}

export interface CreateCommentRequest {
  postId: string;
  content: string;
}

export interface CreateContributionRequest {
  type: ContributionType;
  title: string;
  description?: string;
  referenceId?: string;
}

// ============================================================
// Integration DTOs
// ============================================================

export interface StripeWebhookPayload {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export interface ReferralLinkShare {
  referralCode: string;
  referralLink: string;
  message: string;
  platforms: ('email' | 'twitter' | 'linkedin' | 'facebook')[];
}

export interface RewardClaim {
  rewardIds: string[];
  preferredPaymentMethod: PaymentMethod;
  notes?: string;
}

// ============================================================
// Pagination & Filter Types
// ============================================================

export interface ReferralFilter {
  status?: ReferralStatus;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface PostFilter {
  type?: PostType;
  tags?: string[];
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
  sortBy?: 'recent' | 'popular' | 'trending';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
