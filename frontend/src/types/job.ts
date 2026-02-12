// Frontend Job Types
export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
  INTERNSHIP = 'internship',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  EXECUTIVE = 'executive',
}

export interface Job {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  requirements: string[];
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  job_type: JobType;
  experience_level: ExperienceLevel;
  location: string;
  country: string;
  city: string;
  category_id: string;
  subcategory_id: string;
  company_name: string;
  company_logo_url: string;
  is_featured: boolean;
  status: JobStatus;
  views_count: number;
  applications_count: number;
  is_remote: boolean;
  is_urgent: boolean;
  deadline: Date;
  created_at: Date;
  updated_at: Date;
}

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string;
  is_active: boolean;
}

export interface JobSearchFilters {
  keyword?: string;
  category_id?: string;
  location?: string;
  country?: string;
  city?: string;
  job_type?: JobType;
  experience_level?: ExperienceLevel;
  salary_min?: number;
  salary_max?: number;
  is_remote?: boolean;
  is_featured?: boolean;
  page?: number;
  limit?: number;
  sort?: 'recent' | 'relevant' | 'salary' | 'trending';
}
