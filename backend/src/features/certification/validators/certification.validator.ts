/**
 * Certification Validators using Zod
 * Type-safe validation for all certification-related requests
 */

import { z } from 'zod';
import {
  AssessmentDifficulty,
  AssessmentFormat,
  QuestionType,
  AssessmentStatus,
  CertificationLevel,
  CertificationStatus,
  CertificationType,
  PortfolioItemType,
  PortfolioItemStatus,
  VisibilityLevel,
  VerificationType,
  VerificationStatus,
} from './certification.types';

// ============================================================
// Assessment Validators
// ============================================================

export const DifficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
] as const);

export const AssessmentFormatSchema = z.enum([
  'multiple-choice',
  'practical',
  'coding',
  'essay',
  'mixed',
] as const);

export const QuestionTypeSchema = z.enum([
  'multiple-choice',
  'true-false',
  'code-review',
  'project-based',
  'essay',
] as const);

export const AssessmentStatusSchema = z.enum([
  'draft',
  'published',
  'active',
  'archived',
  'retired',
] as const);

export const CreateAssessmentSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID'),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  difficulty: DifficultySchema,
  format: AssessmentFormatSchema,
  durationMinutes: z
    .number()
    .int()
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration must not exceed 480 minutes'),
  passingScore: z
    .number()
    .int()
    .min(0, 'Passing score must be >= 0')
    .max(100, 'Passing score must be <= 100'),
  metadata: z.record(z.any()).optional(),
});

export const UpdateAssessmentSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  difficulty: DifficultySchema.optional(),
  format: AssessmentFormatSchema.optional(),
  durationMinutes: z
    .number()
    .int()
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration must not exceed 480 minutes')
    .optional(),
  passingScore: z
    .number()
    .int()
    .min(0, 'Passing score must be >= 0')
    .max(100, 'Passing score must be <= 100')
    .optional(),
  status: AssessmentStatusSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const AssessmentQuestionSchema = z.object({
  type: QuestionTypeSchema,
  content: z
    .string()
    .min(10, 'Question content must be at least 10 characters')
    .max(1000, 'Question content must not exceed 1000 characters'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  points: z
    .number()
    .int()
    .min(1, 'Points must be at least 1')
    .max(100, 'Points must not exceed 100'),
  timeLimit: z.number().int().positive().optional(),
  explanation: z.string().max(1000).optional(),
  order: z.number().int().non_negative(),
});

export const StartAssessmentSchema = z.object({
  assessmentId: z.string().uuid('Invalid assessment ID'),
  userId: z.string().uuid('Invalid user ID'),
});

export const SubmitAssessmentSchema = z.object({
  attemptId: z.string().uuid('Invalid attempt ID'),
  answers: z.record(z.string()),
});

// ============================================================
// Certification Validators
// ============================================================

export const CertificationLevelSchema = z.enum([
  'foundational',
  'professional',
  'expert',
  'master',
] as const);

export const CertificationStatusSchema = z.enum([
  'earned',
  'expired',
  'revoked',
  'pending',
] as const);

export const CertificationTypeSchema = z.enum([
  'skill-badge',
  'professional',
  'specialization',
  'credential',
] as const);

export const CreateCertificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  skillId: z.string().uuid('Invalid skill ID'),
  level: CertificationLevelSchema,
  type: CertificationTypeSchema,
  assessmentScore: z
    .number()
    .min(0, 'Score must be >= 0')
    .max(100, 'Score must be <= 100'),
});

export const BadgeDefinitionSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID'),
  level: CertificationLevelSchema,
  name: z
    .string()
    .min(3, 'Badge name must be at least 3 characters')
    .max(50, 'Badge name must not exceed 50 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  icon: z.string().url('Invalid icon URL'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  requirements: z.object({
    assessmentScore: z
      .number()
      .min(0)
      .max(100),
    practicalProjects: z.number().int().non_negative(),
    recommendationCount: z.number().int().non_negative(),
  }),
});

// ============================================================
// Portfolio Validators
// ============================================================

export const PortfolioItemTypeSchema = z.enum([
  'project',
  'certification',
  'achievement',
  'contribution',
] as const);

export const PortfolioItemStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
] as const);

export const VisibilityLevelSchema = z.enum([
  'public',
  'private',
  'portfolio',
  'employers-only',
] as const);

export const CreatePortfolioItemSchema = z.object({
  type: PortfolioItemTypeSchema,
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
  skills: z
    .array(z.string().uuid())
    .min(1, 'At least one skill is required')
    .max(10, 'Maximum 10 skills allowed'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  links: z
    .object({
      github: z.string().url().optional(),
      live: z.string().url().optional(),
      demo: z.string().url().optional(),
      documentation: z.string().url().optional(),
    })
    .optional(),
  media: z
    .object({
      thumbnails: z.array(z.string().url()).optional(),
      screenshots: z.array(z.string().url()).optional(),
      videos: z.array(z.string().url()).optional(),
    })
    .optional(),
});

export const UpdatePortfolioSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters')
    .optional(),
  bio: z
    .string()
    .min(10, 'Bio must be at least 10 characters')
    .max(500, 'Bio must not exceed 500 characters')
    .optional(),
  profileImage: z.string().url('Invalid profile image URL').optional(),
  bannerImage: z.string().url('Invalid banner image URL').optional(),
  socialLinks: z
    .record(z.string().url())
    .optional(),
});

// ============================================================
// Endorsement Validators
// ============================================================

export const EndorseLevelSchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
] as const);

export const EndorseSkillSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  skillId: z.string().uuid('Invalid skill ID'),
  level: EndorseLevelSchema.optional(),
  message: z
    .string()
    .max(500, 'Endorsement message must not exceed 500 characters')
    .optional(),
});

// ============================================================
// Verification Validators
// ============================================================

export const VerificationTypeSchema = z.enum([
  'peer-review',
  'employer-check',
  'automated-scan',
  'expert-review',
] as const);

export const VerificationStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'needs-revision',
] as const);

export const VerifyCredentialSchema = z.object({
  verificationToken: z.string().min(1, 'Verification token is required'),
  verifierId: z.string().uuid('Invalid verifier ID'),
  type: VerificationTypeSchema,
  evidence: z.array(z.string().url()).optional(),
  notes: z.string().max(1000).optional(),
});

// ============================================================
// Filter & Pagination Validators
// ============================================================

export const PaginationSchema = z.object({
  page: z
    .number()
    .int()
    .positive('Page must be a positive integer'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const CertificationFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  skillId: z.string().uuid().optional(),
  level: CertificationLevelSchema.optional(),
  status: CertificationStatusSchema.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const AssessmentFilterSchema = z.object({
  skillId: z.string().uuid().optional(),
  difficulty: DifficultySchema.optional(),
  format: AssessmentFormatSchema.optional(),
  status: AssessmentStatusSchema.optional(),
  searchTerm: z.string().max(100).optional(),
});

// ============================================================
// Type Exports
// ============================================================

export type CreateAssessmentRequest = z.infer<typeof CreateAssessmentSchema>;
export type UpdateAssessmentRequest = z.infer<typeof UpdateAssessmentSchema>;
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type StartAssessmentRequest = z.infer<typeof StartAssessmentSchema>;
export type SubmitAssessmentRequest = z.infer<typeof SubmitAssessmentSchema>;

export type CreateCertificationRequest = z.infer<
  typeof CreateCertificationSchema
>;
export type BadgeDefinition = z.infer<typeof BadgeDefinitionSchema>;

export type CreatePortfolioItemRequest = z.infer<
  typeof CreatePortfolioItemSchema
>;
export type UpdatePortfolioRequest = z.infer<typeof UpdatePortfolioSchema>;

export type EndorseSkillRequest = z.infer<typeof EndorseSkillSchema>;

export type VerifyCredentialRequest = z.infer<typeof VerifyCredentialSchema>;

export type CertificationFilter = z.infer<typeof CertificationFilterSchema>;
export type AssessmentFilter = z.infer<typeof AssessmentFilterSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
