export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  profilePhotoUrl?: string;
  resumeUrl?: string;
}

export interface Employer {
  id: string;
  email: string;
  companyName: string;
  companyLogo?: string;
  industry?: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  companyName: string;
  location: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  jobType: string;
  experienceLevel: string;
  postedAt: string;
  applicants?: number;
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: 'applied' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';
  appliedAt: string;
}
