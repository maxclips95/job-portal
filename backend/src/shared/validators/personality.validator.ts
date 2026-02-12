/**
 * Personality Feature Validators
 * Input validation schemas using Zod
 */

import { z } from 'zod';

export const personalityAssessmentSchema = z.object({
  responses: z.array(
    z.object({
      questionId: z.number().min(1).max(16),
      selectedOption: z.enum(['A', 'B', 'C', 'D']),
    })
  ).length(16, 'Must answer all 16 questions'),
});

export const companyProfileSchema = z.object({
  companyName: z.string().min(2).max(100),
  industry: z.string().min(2).max(50),
  teamSize: z.number().min(1).max(100000),
  culture: z.array(z.string().min(1)).min(1).max(10),
  values: z.array(z.string().min(1)).min(1).max(10),
});

export const compatibilityCheckSchema = z.object({
  candidateId: z.string().uuid('Invalid candidate ID'),
  jobId: z.string().uuid('Invalid job ID'),
});

export type PersonalityAssessment = z.infer<typeof personalityAssessmentSchema>;
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type CompatibilityCheck = z.infer<typeof compatibilityCheckSchema>;
