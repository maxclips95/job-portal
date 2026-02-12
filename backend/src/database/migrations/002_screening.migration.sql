/**
 * Database Migration: Screening Feature Tables
 * Creates tables for screening jobs, results, and analytics
 * 
 * Run: psql -U postgres -d job_portal_db -f screening.migration.sql
 */

-- Create screening_jobs table
CREATE TABLE IF NOT EXISTS screening_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'archived')),
    total_resumes INTEGER NOT NULL CHECK (total_resumes >= 1 AND total_resumes <= 500),
    processed_count INTEGER NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT total_processed_check CHECK (processed_count <= total_resumes)
);

-- Create screening_results table
CREATE TABLE IF NOT EXISTS screening_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_job_id UUID NOT NULL REFERENCES screening_jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_percentage INTEGER NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
    skills_matched TEXT[] NOT NULL DEFAULT '{}',
    skills_missing TEXT[] NOT NULL DEFAULT '{}',
    strengths TEXT[] NOT NULL DEFAULT '{}',
    improvement_areas TEXT[] NOT NULL DEFAULT '{}',
    recommendations TEXT[] NOT NULL DEFAULT '{}',
    shortlisted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(screening_job_id, candidate_id)
);

-- Create screening_metrics table (for analytics/caching)
CREATE TABLE IF NOT EXISTS screening_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_job_id UUID NOT NULL REFERENCES screening_jobs(id) ON DELETE CASCADE,
    total_screened INTEGER NOT NULL DEFAULT 0,
    average_match DECIMAL(5, 2) NOT NULL DEFAULT 0,
    strong_matches INTEGER NOT NULL DEFAULT 0,
    moderate_matches INTEGER NOT NULL DEFAULT 0,
    weak_matches INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(screening_job_id)
);

-- Create indexes for performance
CREATE INDEX idx_screening_jobs_employer_id ON screening_jobs(employer_id);
CREATE INDEX idx_screening_jobs_job_id ON screening_jobs(job_id);
CREATE INDEX idx_screening_jobs_status ON screening_jobs(status);
CREATE INDEX idx_screening_jobs_created_at ON screening_jobs(created_at DESC);

CREATE INDEX idx_screening_results_screening_job_id ON screening_results(screening_job_id);
CREATE INDEX idx_screening_results_candidate_id ON screening_results(candidate_id);
CREATE INDEX idx_screening_results_match_percentage ON screening_results(match_percentage DESC);
CREATE INDEX idx_screening_results_shortlisted ON screening_results(shortlisted);
CREATE INDEX idx_screening_results_created_at ON screening_results(created_at DESC);

CREATE INDEX idx_screening_metrics_screening_job_id ON screening_metrics(screening_job_id);

-- Create view for easy analytics queries
CREATE OR REPLACE VIEW screening_job_summary AS
SELECT 
    sj.id,
    sj.employer_id,
    sj.job_id,
    sj.status,
    sj.total_resumes,
    sj.processed_count,
    COUNT(DISTINCT sr.id) as total_results,
    COUNT(DISTINCT CASE WHEN sr.shortlisted THEN sr.id END) as shortlisted_count,
    AVG(sr.match_percentage) as avg_match_percentage,
    MAX(sr.match_percentage) as max_match_percentage,
    MIN(sr.match_percentage) as min_match_percentage,
    sj.created_at,
    sj.updated_at
FROM screening_jobs sj
LEFT JOIN screening_results sr ON sj.id = sr.screening_job_id
GROUP BY sj.id, sj.employer_id, sj.job_id, sj.status, sj.total_resumes, sj.processed_count, sj.created_at, sj.updated_at;

-- Create function to update screening_metrics
CREATE OR REPLACE FUNCTION update_screening_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO screening_metrics (screening_job_id, total_screened, average_match, strong_matches, moderate_matches, weak_matches)
    SELECT 
        NEW.screening_job_id,
        COUNT(*),
        AVG(sr.match_percentage),
        COUNT(CASE WHEN sr.match_percentage >= 80 THEN 1 END),
        COUNT(CASE WHEN sr.match_percentage >= 50 AND sr.match_percentage < 80 THEN 1 END),
        COUNT(CASE WHEN sr.match_percentage < 50 THEN 1 END)
    FROM screening_results sr
    WHERE sr.screening_job_id = NEW.screening_job_id
    ON CONFLICT (screening_job_id) 
    DO UPDATE SET 
        total_screened = EXCLUDED.total_screened,
        average_match = EXCLUDED.average_match,
        strong_matches = EXCLUDED.strong_matches,
        moderate_matches = EXCLUDED.moderate_matches,
        weak_matches = EXCLUDED.weak_matches,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic metrics update
DROP TRIGGER IF EXISTS trg_update_screening_metrics ON screening_results;
CREATE TRIGGER trg_update_screening_metrics
AFTER INSERT OR UPDATE ON screening_results
FOR EACH ROW
EXECUTE FUNCTION update_screening_metrics();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trg_screening_jobs_updated_at ON screening_jobs;
CREATE TRIGGER trg_screening_jobs_updated_at
BEFORE UPDATE ON screening_jobs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_screening_results_updated_at ON screening_results;
CREATE TRIGGER trg_screening_results_updated_at
BEFORE UPDATE ON screening_results
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_screening_metrics_updated_at ON screening_metrics;
CREATE TRIGGER trg_screening_metrics_updated_at
BEFORE UPDATE ON screening_metrics
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
