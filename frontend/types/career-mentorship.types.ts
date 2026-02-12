export interface SkillMapping {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  timeToLearn: number;
}

export interface SalaryProgression {
  role: string;
  year: number;
  salary: number;
}

export interface CareerGoal {
  id?: string;
  title: string;
  description: string;
  targetDate: Date | string;
  completed?: boolean;
}

export interface CareerPathway {
  id: string;
  userId?: string;
  name?: string;
  timelineYears: number;
  salaryProgression: SalaryProgression[];
  skillsRequired: SkillMapping[];
  goals?: CareerGoal[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Milestone {
  id: string;
  pathwayId: string;
  title: string;
  description?: string;
  skillsRequired?: string[];
  dueDate: Date | string;
  progress?: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface PathwayTemplate {
  id: string;
  name: string;
  description?: string;
  timelineYears?: number;
}

export interface CreatePathwayRequest {
  name?: string;
  timelineYears?: number;
  targetRole?: string;
  currentRole?: string;
  skills?: string[];
}

export interface UpdatePathwayRequest {
  name?: string;
  timelineYears?: number;
  salaryProgression?: SalaryProgression[];
  skillsRequired?: SkillMapping[];
}

export interface CareerPathwayResponse {
  success?: boolean;
  message?: string;
  data: CareerPathway;
}

export interface MilestoneResponse {
  success?: boolean;
  message?: string;
  data: Milestone;
}

export interface MentorProfile {
  id: string;
  userId: string;
  expertise: string[];
  yearsOfExperience: number;
  bio: string;
  hourlyRate?: number;
  acceptingMentees: boolean;
}

export interface MenteeProfile {
  id: string;
  userId: string;
  goals?: CareerGoal[];
}

export interface MentorshipMatch {
  mentorId: string;
  score: number;
  reasons?: string[];
}

export interface MentorshipRelationship {
  id: string;
  mentorId?: string;
  menteeId?: string;
  status: 'active' | 'paused' | 'completed' | string;
  matchScore: number;
  startDate: Date | string;
  goals: CareerGoal[];
}

export interface MentorshipMessage {
  id: string;
  relationshipId: string;
  senderId: string;
  message: string;
  attachments?: string[];
  createdAt: Date | string;
}

export interface FindMentorMatchesRequest {
  skills?: string[];
  goals?: string[];
  limit?: number;
  offset?: number;
}

export interface MentorshipMatchResponse {
  success?: boolean;
  message?: string;
  data: MentorshipMatch[];
}

export interface MentorshipRelationshipResponse {
  success?: boolean;
  message?: string;
  data: MentorshipRelationship;
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}
