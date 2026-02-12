// Job Application Types
export enum ApplicationStatus {
  APPLIED = 'applied',
  REVIEWED = 'reviewed',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
  WITHDRAWN = 'withdrawn',
}

export interface JobApplication {
  id: string;
  job_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  cover_letter: string;
  resume_url: string;
  rating: number;
  notes: string;
  applied_at: Date;
  reviewed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Interview {
  id: string;
  application_id: string;
  interviewer_id: string;
  interview_date: Date;
  interview_type: 'phone' | 'video' | 'in_person';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string;
  rating: number;
  feedback: string;
  created_at: Date;
  updated_at: Date;
}

export interface JobOffer {
  id: string;
  application_id: string;
  position: string;
  salary: number;
  currency: string;
  start_date: Date;
  benefits: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}
