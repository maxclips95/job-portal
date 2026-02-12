/**
 * Phase 2 Database Migrations - Jobs & Related Tables
 * Run with: npm run migrate
 */

export const phase2Migrations = [
  {
    name: '004_create_job_categories_table',
    up: `
      CREATE TABLE IF NOT EXISTS job_categories (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX job_categories_slug_idx (slug),
        INDEX job_categories_is_active_idx (is_active)
      );
    `,
    down: `DROP TABLE IF EXISTS job_categories;`,
  },
  {
    name: '005_create_job_subcategories_table',
    up: `
      CREATE TABLE IF NOT EXISTS job_subcategories (
        id UUID PRIMARY KEY,
        category_id UUID NOT NULL REFERENCES job_categories(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id, slug),
        INDEX job_subcategories_category_id_idx (category_id),
        INDEX job_subcategories_slug_idx (slug)
      );
    `,
    down: `DROP TABLE IF EXISTS job_subcategories;`,
  },
  {
    name: '006_create_job_locations_table',
    up: `
      CREATE TABLE IF NOT EXISTS job_locations (
        id UUID PRIMARY KEY,
        country VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(country, city),
        INDEX job_locations_country_idx (country),
        INDEX job_locations_city_idx (city)
      );
    `,
    down: `DROP TABLE IF EXISTS job_locations;`,
  },
  {
    name: '007_create_jobs_table',
    up: `
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY,
        employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        salary_min DECIMAL(12, 2),
        salary_max DECIMAL(12, 2),
        salary_currency VARCHAR(3) DEFAULT 'USD',
        job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('full_time', 'part_time', 'contract', 'temporary', 'internship')),
        experience_level VARCHAR(50) NOT NULL CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive')),
        location VARCHAR(255),
        country VARCHAR(100),
        city VARCHAR(100),
        category_id UUID NOT NULL REFERENCES job_categories(id),
        subcategory_id UUID NOT NULL REFERENCES job_subcategories(id),
        company_name VARCHAR(255) NOT NULL,
        company_logo_url VARCHAR(500),
        is_featured BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'expired')),
        views_count INT DEFAULT 0,
        applications_count INT DEFAULT 0,
        applications_threshold INT,
        is_remote BOOLEAN DEFAULT FALSE,
        is_urgent BOOLEAN DEFAULT FALSE,
        deadline TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX jobs_employer_id_idx (employer_id),
        INDEX jobs_status_idx (status),
        INDEX jobs_category_id_idx (category_id),
        INDEX jobs_is_featured_idx (is_featured),
        INDEX jobs_created_at_idx (created_at),
        INDEX jobs_deadline_idx (deadline),
        INDEX jobs_country_city_idx (country, city),
        FULLTEXT INDEX jobs_fulltext (title, description)
      );
    `,
    down: `DROP TABLE IF EXISTS jobs;`,
  },
  {
    name: '008_create_employer_profiles_table',
    up: `
      CREATE TABLE IF NOT EXISTS employer_profiles (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        company_email VARCHAR(255),
        company_phone VARCHAR(20),
        company_website VARCHAR(500),
        company_description TEXT,
        company_logo_url VARCHAR(500),
        company_banner_url VARCHAR(500),
        company_size VARCHAR(50),
        industry VARCHAR(100),
        headquarters_country VARCHAR(100),
        headquarters_city VARCHAR(100),
        employees_count INT,
        founded_year INT,
        is_verified BOOLEAN DEFAULT FALSE,
        verification_date TIMESTAMP,
        total_jobs_posted INT DEFAULT 0,
        total_applicants INT DEFAULT 0,
        rating DECIMAL(3, 2) DEFAULT 0,
        reviews_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX employer_profiles_user_id_idx (user_id),
        INDEX employer_profiles_is_verified_idx (is_verified),
        INDEX employer_profiles_rating_idx (rating)
      );
    `,
    down: `DROP TABLE IF EXISTS employer_profiles;`,
  },
];
