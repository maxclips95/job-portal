/**
 * Certification Types & Interfaces
 * Comprehensive type definitions for skills certification system
 */

// ============================================================
// Core Assessment Types
// ============================================================

export type AssessmentDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type AssessmentFormat = 'multiple-choice' | 'practical' | 'coding' | 'essay' | 'mixed';
export type QuestionType = 'multiple-choice' | 'true-false' | 'code-review' | 'project-based' | 'essay';
export type AssessmentStatus = 'draft' | 'published' | 'active' | 'archived' | 'retired';

export interface Assessment {
  id: string;
  skillId: string;
  title: string;
  description: string;
  difficulty: AssessmentDifficulty;
  format: AssessmentFormat;
  durationMinutes: number;
  passingScore: number;
  totalQuestions: number;
  createdAt: Date;
  updatedAt: Date;
  status: AssessmentStatus;
  creator: string;
  metadata: Record<string, any>;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  type: QuestionType;
  content: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  timeLimit?: number;
  explanation?: string;
  order: number;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'in-progress' | 'completed' | 'abandoned';
  score?: number;
  answers: Record<string, string>;
  timeSpent?: number;
  percentageScore?: number;
  isPassed?: boolean;
}

// ============================================================
// Certification Types
// ============================================================

export type CertificationLevel = 'foundational' | 'professional' | 'expert' | 'master';
export type CertificationStatus = 'earned' | 'expired' | 'revoked' | 'pending';
export type CertificationType = 'skill-badge' | 'professional' | 'specialization' | 'credential';

export interface Certification {
  id: string;
  skillId: string;
  userId: string;
  level: CertificationLevel;
  type: CertificationType;
  earnedDate: Date;
  expiryDate?: Date;
  status: CertificationStatus;
  verificationToken: string;
  credentialUrl: string;
  issuer: string;
  metadata: {
    score: number;
    assessmentIds: string[];
    endorsements: number;
    verifications: number;
  };
}

export interface BadgeDefinition {
  id: string;
  skillId: string;
  level: CertificationLevel;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirements: {
    assessmentScore: number;
    practicalProjects: number;
    recommendationCount: number;
  };
  displayOrder: number;
  active: boolean;
}

// ============================================================
// Portfolio Types
// ============================================================

export type PortfolioItemType = 'project' | 'certification' | 'achievement' | 'contribution';
export type PortfolioItemStatus = 'draft' | 'published' | 'archived';
export type VisibilityLevel = 'public' | 'private' | 'portfolio' | 'employers-only';

export interface PortfolioItem {
  id: string;
  userId: string;
  type: PortfolioItemType;
  title: string;
  description: string;
  skills: string[];
  startDate?: Date;
  endDate?: Date;
  status: PortfolioItemStatus;
  visibility: VisibilityLevel;
  links?: {
    github?: string;
    live?: string;
    demo?: string;
    documentation?: string;
  };
  media?: {
    thumbnails: string[];
    screenshots: string[];
    videos: string[];
  };
  achievements: string[];
  metrics?: {
    stars?: number;
    forks?: number;
    downloads?: number;
    impact?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Portfolio {
  id: string;
  userId: string;
  title: string;
  bio: string;
  profileImage: string;
  bannerImage?: string;
  items: PortfolioItem[];
  certifications: Certification[];
  skills: SkillEndorsement[];
  stats: {
    totalProjects: number;
    totalCertifications: number;
    totalEndorsements: number;
    viewCount: number;
  };
  published: boolean;
  publicUrl: string;
  socialLinks?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Verification Types
// ============================================================

export type VerificationType = 'peer-review' | 'employer-check' | 'automated-scan' | 'expert-review';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'needs-revision';

export interface CertificationVerification {
  id: string;
  certificationId: string;
  verifierId: string;
  type: VerificationType;
  status: VerificationStatus;
  notes: string;
  evidence?: string[];
  verifiedAt?: Date;
  expiresAt: Date;
}

export interface SkillEndorsement {
  id: string;
  userId: string;
  skillId: string;
  endorsedBy: string;
  endorsementDate: Date;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  message?: string;
  verified: boolean;
  weight: number; // Trust score
}

// ============================================================
// Request/Response DTOs
// ============================================================

export interface CreateAssessmentRequest {
  skillId: string;
  title: string;
  description: string;
  difficulty: AssessmentDifficulty;
  format: AssessmentFormat;
  durationMinutes: number;
  passingScore: number;
  metadata?: Record<string, any>;
}

export interface UpdateAssessmentRequest {
  title?: string;
  description?: string;
  difficulty?: AssessmentDifficulty;
  format?: AssessmentFormat;
  durationMinutes?: number;
  passingScore?: number;
  status?: AssessmentStatus;
  metadata?: Record<string, any>;
}

export interface StartAssessmentRequest {
  assessmentId: string;
  userId: string;
}

export interface SubmitAssessmentRequest {
  attemptId: string;
  answers: Record<string, string>;
}

export interface CreateCertificationRequest {
  userId: string;
  skillId: string;
  level: CertificationLevel;
  type: CertificationType;
  assessmentScore: number;
}

export interface EndorseSkillRequest {
  userId: string;
  skillId: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  message?: string;
}

export interface CreatePortfolioItemRequest {
  type: PortfolioItemType;
  title: string;
  description: string;
  skills: string[];
  startDate?: Date;
  endDate?: Date;
  links?: {
    github?: string;
    live?: string;
    demo?: string;
    documentation?: string;
  };
  media?: {
    thumbnails: string[];
    screenshots: string[];
    videos: string[];
  };
}

export interface UpdatePortfolioRequest {
  title?: string;
  bio?: string;
  profileImage?: string;
  bannerImage?: string;
  socialLinks?: Record<string, string>;
}

export interface CreateBadgeRequest {
  skillId: string;
  level: CertificationLevel;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirements: {
    assessmentScore: number;
    practicalProjects: number;
    recommendationCount: number;
  };
}

export interface VerifyCredentialRequest {
  verificationToken: string;
  verifierId: string;
  type: VerificationType;
  evidence?: string[];
  notes?: string;
}

// ============================================================
// Service Response Types
// ============================================================

export interface AssessmentResult {
  attemptId: string;
  score: number;
  percentageScore: number;
  isPassed: boolean;
  timeSpent: number;
  feedback: string;
  recommendations: string[];
}

export interface CertificationAchievement {
  certification: Certification;
  badge: BadgeDefinition;
  earnedAt: Date;
  sharedOn?: string[];
}

export interface PortfolioAnalytics {
  totalViews: number;
  viewsByDay: { date: string; count: number }[];
  topItems: PortfolioItem[];
  conversionRate: number;
  engagementScore: number;
}

export interface SkillProfile {
  userId: string;
  skills: SkillEndorsement[];
  certifications: Certification[];
  assessmentScores: {
    skillId: string;
    bestScore: number;
    attemptCount: number;
  }[];
  endorsementStats: {
    totalEndorsements: number;
    topEndorsedSkill: string;
    trustScore: number;
  };
}

export interface CertificationVerificationResult {
  isValid: boolean;
  certification: Certification;
  verifications: CertificationVerification[];
  trustLevel: 'high' | 'medium' | 'low';
  lastVerified: Date;
}

// ============================================================
// Analytics Types
// ============================================================

export interface CertificationStats {
  totalCertifications: number;
  certificationsByLevel: Record<CertificationLevel, number>;
  certificationsBySkill: { skillId: string; count: number }[];
  activeCredentials: number;
  expiredCredentials: number;
  earningTrend: { date: string; count: number }[];
}

export interface AssessmentStats {
  totalAssessments: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  completionRate: number;
  difficultyDistribution: Record<AssessmentDifficulty, number>;
  averageTimeSpent: number;
  topAssessments: {
    assessmentId: string;
    attemptCount: number;
    averageScore: number;
  }[];
}

export interface PortfolioStats {
  totalPortfolios: number;
  publishedPortfolios: number;
  averageItemCount: number;
  totalProjectsShared: number;
  totalCertificationsDisplayed: number;
  viewsPerPortfolio: number;
}

// ============================================================
// Pagination & Filter Types
// ============================================================

export interface CertificationFilter {
  userId?: string;
  skillId?: string;
  level?: CertificationLevel;
  status?: CertificationStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface AssessmentFilter {
  skillId?: string;
  difficulty?: AssessmentDifficulty;
  format?: AssessmentFormat;
  status?: AssessmentStatus;
  searchTerm?: string;
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
