/**
 * Database Type Definitions
 * All database table interfaces
 */

// ==================== SCREENING ====================

export interface ScreeningJob {
  id: string;
  employer_id: string;
  job_id: string;
  status: 'pending' | 'processing' | 'completed';
  total_resumes: number;
  processed_count: number;
  shortlisted_candidates: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface ScreeningResult {
  id: string;
  screening_job_id: string;
  resume_id: string;
  candidate_id: string;
  match_percentage: number;
  skills_matched: string[];
  skills_missing: string[];
  strengths: string[];
  improvement_areas: string[];
  recommendations: string[];
  status: 'completed' | 'error';
  created_at: Date;
}

export interface ScreeningMetrics {
  totalScreened: number;
  averageMatch: number;
  maxMatch: number;
  minMatch: number;
  strongMatches: number;
  moderateMatches: number;
  weakMatches: number;
}

// ==================== PERSONALITY ====================

export interface PersonalityAssessment {
  id: string;
  candidate_id: string;
  disc_type: 'D' | 'I' | 'S' | 'C';
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
  primary_type: string;
  secondary_type: string;
  strengths: string[];
  challenges: string[];
  work_style: string;
  leadership_style: string;
  team_role: string;
  created_at: Date;
  updated_at: Date;
}

export interface CompanyProfile {
  id: string;
  employer_id: string;
  company_name: string;
  industry: string;
  team_size: number;
  culture_values: string[];
  company_values: string[];
  ideal_disc_types: string[];
  team_dynamics: string;
  created_at: Date;
  updated_at: Date;
}

export interface CompatibilityResult {
  id: string;
  candidate_id: string;
  company_id: string;
  overall_compatibility: number;
  disc_compatibility: number;
  cultural_fit: number;
  team_fit: number;
  matched_traits: string[];
  missing_traits: string[];
  recommendations: string[];
  created_at: Date;
}

// ==================== ANALYTICS ====================

export interface MarketAnalytic {
  id: string;
  date: Date;
  job_title: string;
  location: string;
  average_salary: number;
  salary_range: {
    min: number;
    max: number;
  };
  skill_demand: {
    skill: string;
    demand_score: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  hiring_volume: number;
  created_at: Date;
}

export interface SalaryBenchmark {
  id: string;
  job_title: string;
  location: string;
  experience_level: string;
  min_salary: number;
  max_salary: number;
  median_salary: number;
  sample_size: number;
  created_at: Date;
  updated_at: Date;
}

export interface SkillTrend {
  id: string;
  skill_name: string;
  demand_score: number;
  trend: 'up' | 'down' | 'stable';
  forecast_3_months: number;
  forecast_6_months: number;
  forecast_12_months: number;
  created_at: Date;
  updated_at: Date;
}

// ==================== CERTIFICATION ====================

export interface SkillAssessment {
  id: string;
  skill_name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  question_count: number;
  duration_minutes: number;
  pass_score: number;
  created_at: Date;
}

export interface AssessmentAttempt {
  id: string;
  candidate_id: string;
  assessment_id: string;
  started_at: Date;
  completed_at: Date | null;
  score: number | null;
  status: 'in_progress' | 'completed' | 'failed';
  answers: Record<string, string>;
  attempt_number: number;
}

export interface Certification {
  id: string;
  candidate_id: string;
  skill_name: string;
  issue_date: Date;
  expiry_date: Date | null;
  certificate_url: string;
  qr_code: string;
  verification_code: string;
  created_at: Date;
}

// ==================== REFERRAL ====================

export interface ReferralLink {
  id: string;
  referrer_id: string;
  link_code: string;
  created_at: Date;
  expires_at: Date;
}

export interface ReferralConversion {
  id: string;
  referral_link_id: string;
  referee_id: string;
  conversion_type: 'candidate_hire' | 'employer_signup';
  bounty_amount: number;
  status: 'pending' | 'approved' | 'paid';
  created_at: Date;
  paid_at: Date | null;
}

export interface ReferralEarning {
  id: string;
  referrer_id: string;
  total_earned: number;
  total_paid: number;
  pending_amount: number;
  last_payout_date: Date | null;
  updated_at: Date;
}

// ==================== COLLABORATION ====================

export interface HiringTeam {
  id: string;
  employer_id: string;
  team_name: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMessage {
  id: string;
  team_id: string;
  sender_id: string;
  content: string;
  attachments: string[] | null;
  created_at: Date;
  edited_at: Date | null;
}

export interface CandidateScorecard {
  id: string;
  candidate_id: string;
  job_id: string;
  team_member_id: string;
  technical_score: number;
  cultural_fit_score: number;
  communication_score: number;
  potential_score: number;
  overall_score: number;
  feedback: string;
  created_at: Date;
}

export interface JobOffer {
  id: string;
  candidate_id: string;
  job_id: string;
  salary: number;
  benefits: string[];
  start_date: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: Date;
  signed_at: Date | null;
  created_at: Date;
}

// ==================== PREDICTIONS ====================

export interface PredictionModel {
  id: string;
  model_name: string;
  model_type: string;
  version: string;
  accuracy: number;
  last_trained: Date;
  is_active: boolean;
  created_at: Date;
}

export interface Prediction {
  id: string;
  candidate_id: string;
  job_id: string;
  model_id: string;
  prediction_type: 'success' | 'retention' | 'salary' | 'productivity';
  prediction_score: number;
  confidence: number;
  explanation: string;
  created_at: Date;
}

export interface BiasAudit {
  id: string;
  audit_date: Date;
  total_candidates: number;
  bias_score: number;
  gender_distribution: Record<string, number>;
  diversity_score: number;
  recommendations: string[];
  created_at: Date;
}

// ==================== CAREER PATH ====================

export interface CareerPath {
  id: string;
  candidate_id: string;
  current_role: string;
  next_role: string;
  skills_needed: string[];
  estimated_timeline: number;
  salary_progression: number[];
  created_at: Date;
  updated_at: Date;
}

export interface LearningPlan {
  id: string;
  candidate_id: string;
  goal_skill: string;
  courses: {
    name: string;
    platform: string;
    duration: number;
    cost: number;
  }[];
  estimated_completion: Date;
  created_at: Date;
}

export interface CareerGoal {
  id: string;
  candidate_id: string;
  goal_title: string;
  target_role: string;
  target_salary: number;
  deadline: Date;
  progress_percentage: number;
  status: 'active' | 'completed' | 'archived';
  created_at: Date;
  updated_at: Date;
}
