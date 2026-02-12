/**
 * Screening Feature Validators
 * Input validation schemas using Zod
 */

import { z } from 'zod';

export const uploadScreeningBatchSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  resumes: z.array(z.instanceof(File)).min(1, 'At least 1 resume required').max(500, 'Maximum 500 resumes'),
});

export const screeningFilterSchema = z.object({
  minMatchPercentage: z.number().min(0).max(100).optional(),
  status: z.enum(['pending', 'completed']).optional(),
  sortBy: z.enum(['match_percentage', 'created_at']).optional(),
  sortDesc: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const shortlistSchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1, 'At least 1 candidate required'),
});

export type UploadScreeningBatch = z.infer<typeof uploadScreeningBatchSchema>;
export type ScreeningFilter = z.infer<typeof screeningFilterSchema>;
export type Shortlist = z.infer<typeof shortlistSchema>;
