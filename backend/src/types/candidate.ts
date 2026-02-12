// Candidate/User Profile Types
export enum CandidateStatus {
  INCOMPLETE = 'incomplete',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  title: string;
  bio: string;
  experience_years: number;
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  certifications: string[];
  resume_url: string;
  profile_photo_url: string;
  portfolio_url: string;
  github_url: string;
  linkedin_url: string;
  location: string;
  country: string;
  city: string;
  is_open_to_work: boolean;
  preferred_job_type: string;
  preferred_locations: string[];
  status: CandidateStatus;
  profile_completion_percentage: number;
  viewed_count: number;
  saved_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface EducationEntry {
  id: string;
  degree: string;
  field_of_study: string;
  school: string;
  start_date: Date;
  end_date: Date;
  is_current: boolean;
  description: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  employment_type: string;
  start_date: Date;
  end_date: Date;
  is_current: boolean;
  description: string;
  skills_used: string[];
}

export interface SavedJob {
  id: string;
  candidate_id: string;
  job_id: string;
  saved_at: Date;
}
