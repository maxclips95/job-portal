/**
 * Referral Validators using Zod
 */

import { z } from 'zod';

export const CreateReferralSchema = z.object({
  source: z.string().optional(),
  campaign: z.string().optional(),
});

export const AcceptReferralSchema = z.object({
  referralCode: z.string().min(6).max(20),
  email: z.string().email().optional(),
});

export const CreateRewardSchema = z.object({
  referralId: z.string().uuid(),
  rewardType: z.enum(['credit', 'bonus-credits', 'discount', 'premium-access']),
  amount: z.number().positive(),
});

export const CreatePaymentInfoSchema = z.object({
  method: z.enum(['credit-card', 'bank-transfer', 'paypal', 'stripe']),
  stripePaymentMethodId: z.string().optional(),
  bankDetails: z.object({
    accountNumber: z.string(),
    routingNumber: z.string(),
    bankName: z.string(),
  }).optional(),
  paypalEmail: z.string().email().optional(),
  primary: z.boolean(),
});

export const RequestPayoutSchema = z.object({
  paymentInfoId: z.string().uuid(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'on-demand']),
  rewardIds: z.array(z.string().uuid()).optional(),
});

export const CreatePostSchema = z.object({
  type: z.enum(['discussion', 'question', 'resource', 'job-tip', 'success-story']),
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(5000),
  tags: z.array(z.string()).max(10),
});

export const CreateCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(1000),
});

// Type exports
export type CreateReferralRequest = z.infer<typeof CreateReferralSchema>;
export type AcceptReferralRequest = z.infer<typeof AcceptReferralSchema>;
export type CreateRewardRequest = z.infer<typeof CreateRewardSchema>;
export type CreatePaymentInfoRequest = z.infer<typeof CreatePaymentInfoSchema>;
export type RequestPayoutRequest = z.infer<typeof RequestPayoutSchema>;
export type CreatePostRequest = z.infer<typeof CreatePostSchema>;
export type CreateCommentRequest = z.infer<typeof CreateCommentSchema>;
