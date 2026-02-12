// Career Pathway Types
export type PathwayStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed';
export type MentorshipStatus = 'pending' | 'active' | 'paused' | 'completed' | 'ended';

// Career Pathway Interfaces
export interface SalaryProgression {
  year: number;
  salary: number;
  role: string;
  milestone: string;
}

export interface SkillMapping {
  skill: string;
  currentLevel: number; // 0-5
  targetLevel: number; // 1-5
  importance: number; // 1-5
  timeToLearn: number; // hours
}

export interface CareerPathway {
  id: string;
  userId: string;
  name: string;
  description: string;
  startRole: string;
  targetRole: string;
  timelineYears: number;
  salaryProgression: SalaryProgression[];
  skillsRequired: SkillMapping[];
  visibility: 'private' | 'public' | 'shared';
  status: PathwayStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PathwayTemplate extends CareerPathway {
  usageCount?: number;
  rating?: number;
}

export interface Milestone {
  id: string;
  pathwayId: string;
  title: string;
  description: string;
  skillsRequired: string[];
  dueDate: Date;
  status: MilestoneStatus;
  progressPercentage: number; // 0-100
  completedAt?: Date;
  createdAt: Date;
}

// Mentorship Types
export interface MentorProfile {
  userId: string;
  expertise: string[];
  yearsOfExperience: number;
  bio: string;
  availability: {
    hoursPerWeek: number;
    timezone: string;
  };
  hourlyRate?: number;
  rating: number; // 0-5
  reviewCount: number;
  acceptingMentees: boolean;
}

export interface MenteeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  currentRole: string;
  skills: Array<{
    name: string;
    level: string;
  }>;
  yearsOfExperience: number;
}

export interface CompatibilityScore {
  score: number; // 0-100
  skillMatch: number; // 0-100
  experienceMatch: number; // 0-100
  goalMatch: number; // 0-100
  availabilityMatch: number; // 0-100
}

export interface MentorshipMatch {
  mentorId: string;
  mentorName: string;
  expertise: string[];
  yearsOfExperience: number;
  rating: number;
  reviewCount: number;
  availability: {
    hoursPerWeek: number;
    timezone: string;
  };
  hourlyRate?: number;
  bio: string;
  compatibilityScore: number;
  compatibilityDetails: CompatibilityScore;
}

export interface MentorshipGoal {
  id?: string;
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface MentorshipRelationship {
  id: string;
  mentorId: string;
  menteeId: string;
  goals: MentorshipGoal[];
  matchScore: number; // 0-100
  status: MentorshipStatus;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

export interface MentorshipMessage {
  id: string;
  relationshipId: string;
  senderId: string;
  message: string;
  attachments?: string[];
  readAt?: Date;
  createdAt: Date;
}

export interface MentorshipReview {
  id: string;
  relationshipId: string;
  reviewerId: string;
  rating: number; // 0-5
  feedback: string;
  createdAt: Date;
}

// PWA Types
export interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  careerUpdates: boolean;
  mentorMessages: boolean;
  milestoneReminders: boolean;
  industryNews: boolean;
  jobRecommendations: boolean;
  applicationUpdates: boolean;
  frequency: 'daily' | 'weekly' | 'none';
}

export interface PWAInstallation {
  id: string;
  userId: string;
  userAgent: string;
  installedAt: Date;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  syncType: string;
  data: Record<string, any>;
  synced: boolean;
  syncedAt?: Date;
  createdAt: Date;
}

// Request DTOs
export interface CreatePathwayRequest {
  name: string;
  description?: string;
  startRole: string;
  targetRole: string;
  timelineYears: number;
  skillsRequired?: string[];
  visibility?: 'private' | 'public' | 'shared';
}

export interface UpdatePathwayRequest {
  name?: string;
  description?: string;
  targetRole?: string;
  timelineYears?: number;
  status?: PathwayStatus;
}

export interface CreateMentorProfileRequest {
  expertise: string[];
  yearsOfExperience: number;
  bio: string;
  availability: {
    hoursPerWeek: number;
    timezone: string;
  };
  hourlyRate?: number;
  acceptingMentees: boolean;
}

export interface FindMentorMatchesRequest {
  expertise?: string[];
  maxResults?: number;
  minCompatibility?: number;
}

export interface CreateMentorshipRequest {
  mentorId: string;
  menteeId: string;
  goals: MentorshipGoal[];
}

export interface SubscribeToPushRequest {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

// Response DTOs
export interface CareerPathwayResponse {
  success: boolean;
  data: CareerPathway;
  message?: string;
}

export interface MilestoneResponse {
  success: boolean;
  data: Milestone;
  message?: string;
}

export interface MentorshipMatchResponse {
  success: boolean;
  data: MentorshipMatch[];
  count: number;
  message?: string;
}

export interface MentorshipRelationshipResponse {
  success: boolean;
  data: MentorshipRelationship;
  message?: string;
}

export interface NotificationResponse {
  success: boolean;
  sentCount: number;
  message?: string;
}
