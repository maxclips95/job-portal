import { QueryResult } from 'pg';

interface Migration {
  name: string;
  up: string;
}

export const phase3Migrations: Migration[] = [
  {
    name: '003_applications_schema',
    up: `
      CREATE TABLE IF NOT EXISTS job_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cover_letter TEXT,
        resume_url VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reviewed', 'shortlisted', 'rejected', 'accepted', 'withdrawn')),
        rating DECIMAL(3,1),
        notes TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, candidate_id)
      );

      CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
      CREATE INDEX idx_job_applications_candidate_id ON job_applications(candidate_id);
      CREATE INDEX idx_job_applications_status ON job_applications(status);
      CREATE INDEX idx_job_applications_created_at ON job_applications(created_at DESC);
    `,
  },
  {
    name: '003_interviews_schema',
    up: `
      CREATE TABLE IF NOT EXISTS interviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
        interview_type VARCHAR(50) NOT NULL CHECK (interview_type IN ('phone', 'video', 'in_person', 'written')),
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
        scheduled_at TIMESTAMP,
        duration_minutes INTEGER,
        interview_link VARCHAR(255),
        interviewer_id UUID REFERENCES users(id),
        feedback TEXT,
        rating DECIMAL(3,1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_interviews_application_id ON interviews(application_id);
      CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at DESC);
      CREATE INDEX idx_interviews_status ON interviews(status);
    `,
  },
  {
    name: '003_job_offers_schema',
    up: `
      CREATE TABLE IF NOT EXISTS job_offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
        position_title VARCHAR(255) NOT NULL,
        salary DECIMAL(12,2),
        benefits TEXT,
        start_date DATE,
        expiration_date TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_job_offers_application_id ON job_offers(application_id);
      CREATE INDEX idx_job_offers_status ON job_offers(status);
      CREATE INDEX idx_job_offers_expiration_date ON job_offers(expiration_date);
    `,
  },
  {
    name: '003_saved_jobs_schema',
    up: `
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id, job_id)
      );

      CREATE INDEX idx_saved_jobs_candidate_id ON saved_jobs(candidate_id);
      CREATE INDEX idx_saved_jobs_job_id ON saved_jobs(job_id);
      CREATE INDEX idx_saved_jobs_saved_at ON saved_jobs(saved_at DESC);
    `,
  },
  {
    name: '003_candidate_profiles_schema',
    up: `
      CREATE TABLE IF NOT EXISTS candidate_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        bio TEXT,
        profile_image_url VARCHAR(255),
        resume_url VARCHAR(255),
        phone_number VARCHAR(20),
        location VARCHAR(255),
        country VARCHAR(100),
        city VARCHAR(100),
        state VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        years_of_experience INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'active', 'inactive', 'suspended')),
        visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles(user_id);
      CREATE INDEX idx_candidate_profiles_status ON candidate_profiles(status);
      CREATE INDEX idx_candidate_profiles_location ON candidate_profiles(country, city);
    `,
  },
  {
    name: '003_candidate_education_schema',
    up: `
      CREATE TABLE IF NOT EXISTS candidate_education (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
        institution_name VARCHAR(255) NOT NULL,
        degree VARCHAR(100) NOT NULL,
        field_of_study VARCHAR(100),
        start_date DATE,
        end_date DATE,
        is_current BOOLEAN DEFAULT false,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_candidate_education_candidate_id ON candidate_education(candidate_id);
    `,
  },
  {
    name: '003_candidate_experience_schema',
    up: `
      CREATE TABLE IF NOT EXISTS candidate_experience (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        employment_type VARCHAR(50),
        location VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE,
        is_current BOOLEAN DEFAULT false,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_candidate_experience_candidate_id ON candidate_experience(candidate_id);
      CREATE INDEX idx_candidate_experience_is_current ON candidate_experience(is_current);
    `,
  },
];
