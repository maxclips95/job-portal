import { Logger } from '@/utils/logger';
import { CandidateProfile, EducationEntry, ExperienceEntry } from '@/types/candidate';

const logger = new Logger('CandidateService');

interface QueryableDb {
  query: (queryText: string, params?: any[]) => Promise<any>;
}

export class CandidateService {
  constructor(private db: QueryableDb) {}

  /**
   * Create or get candidate profile
   */
  async getOrCreateProfile(userId: string): Promise<CandidateProfile> {
    try {
      // Try to get existing profile
      let result = await this.db.query(
        'SELECT * FROM candidate_profiles WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Create new profile if doesn't exist
      result = await this.db.query(
        `INSERT INTO candidate_profiles (user_id, status, visibility)
         VALUES ($1, 'incomplete', 'private')
         RETURNING id, user_id, title, bio, profile_image_url, resume_url, phone_number, 
                   location, country, city, state, years_of_experience, status, visibility, created_at, updated_at`,
        [userId]
      );

      logger.info(`Candidate profile created for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting/creating candidate profile:', error);
      throw error;
    }
  }

  /**
   * Update candidate profile
   */
  async updateProfile(userId: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile> {
    try {
      const fields = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'user_id')
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      if (!fields) {
        throw new Error('No fields to update');
      }

      const values = Object.values(updates).filter(v => v !== undefined);
      values.push(userId);

      const result = await this.db.query(
        `UPDATE candidate_profiles 
         SET ${fields}, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $${values.length} 
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Profile not found');
      }

      logger.info(`Candidate profile updated for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating candidate profile:', error);
      throw error;
    }
  }

  /**
   * Get candidate profile by ID
   */
  async getProfileById(profileId: string): Promise<CandidateProfile> {
    try {
      const result = await this.db.query(
        'SELECT * FROM candidate_profiles WHERE id = $1',
        [profileId]
      );

      if (result.rows.length === 0) {
        throw new Error('Candidate profile not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching candidate profile:', error);
      throw error;
    }
  }

  /**
   * Get candidate with education and experience
   */
  async getCandidateDetails(profileId: string): Promise<any> {
    try {
      const profileResult = await this.db.query(
        'SELECT * FROM candidate_profiles WHERE id = $1',
        [profileId]
      );

      if (profileResult.rows.length === 0) {
        throw new Error('Candidate not found');
      }

      const educationResult = await this.db.query(
        'SELECT * FROM candidate_education WHERE candidate_id = $1 ORDER BY start_date DESC',
        [profileId]
      );

      const experienceResult = await this.db.query(
        'SELECT * FROM candidate_experience WHERE candidate_id = $1 ORDER BY start_date DESC',
        [profileId]
      );

      return {
        profile: profileResult.rows[0],
        education: educationResult.rows,
        experience: experienceResult.rows,
      };
    } catch (error) {
      logger.error('Error fetching candidate details:', error);
      throw error;
    }
  }

  /**
   * Add education entry
   */
  async addEducation(
    candidateId: string,
    institutionName: string,
    degree: string,
    fieldOfStudy: string,
    startDate: Date,
    endDate?: Date,
    description?: string
  ): Promise<EducationEntry> {
    try {
      const result = await this.db.query(
        `INSERT INTO candidate_education (
          candidate_id, institution_name, degree, field_of_study, start_date, end_date, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, candidate_id, institution_name, degree, field_of_study, start_date, end_date, description, created_at`,
        [candidateId, institutionName, degree, fieldOfStudy, startDate, endDate, description]
      );

      logger.info(`Education entry added for candidate ${candidateId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding education:', error);
      throw error;
    }
  }

  /**
   * Get education entries
   */
  async getEducation(candidateId: string): Promise<EducationEntry[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM candidate_education WHERE candidate_id = $1 ORDER BY start_date DESC',
        [candidateId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching education:', error);
      throw error;
    }
  }

  /**
   * Update education entry
   */
  async updateEducation(educationId: string, updates: Partial<EducationEntry>): Promise<EducationEntry> {
    try {
      const fields = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'candidate_id')
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      if (!fields) {
        throw new Error('No fields to update');
      }

      const values = Object.values(updates).filter(v => v !== undefined);
      values.push(educationId);

      const result = await this.db.query(
        `UPDATE candidate_education SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Education entry not found');
      }

      logger.info(`Education entry ${educationId} updated`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating education:', error);
      throw error;
    }
  }

  /**
   * Delete education entry
   */
  async deleteEducation(educationId: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM candidate_education WHERE id = $1',
        [educationId]
      );

      if (result.rowCount === 0) {
        throw new Error('Education entry not found');
      }

      logger.info(`Education entry ${educationId} deleted`);
    } catch (error) {
      logger.error('Error deleting education:', error);
      throw error;
    }
  }

  /**
   * Add experience entry
   */
  async addExperience(
    candidateId: string,
    companyName: string,
    jobTitle: string,
    employmentType: string,
    location: string,
    startDate: Date,
    endDate?: Date,
    description?: string
  ): Promise<ExperienceEntry> {
    try {
      const result = await this.db.query(
        `INSERT INTO candidate_experience (
          candidate_id, company_name, job_title, employment_type, location, start_date, end_date, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, candidate_id, company_name, job_title, employment_type, location, start_date, end_date, description, created_at`,
        [candidateId, companyName, jobTitle, employmentType, location, startDate, endDate, description]
      );

      logger.info(`Experience entry added for candidate ${candidateId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding experience:', error);
      throw error;
    }
  }

  /**
   * Get experience entries
   */
  async getExperience(candidateId: string): Promise<ExperienceEntry[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM candidate_experience WHERE candidate_id = $1 ORDER BY start_date DESC',
        [candidateId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching experience:', error);
      throw error;
    }
  }

  /**
   * Update experience entry
   */
  async updateExperience(experienceId: string, updates: Partial<ExperienceEntry>): Promise<ExperienceEntry> {
    try {
      const fields = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'candidate_id')
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      if (!fields) {
        throw new Error('No fields to update');
      }

      const values = Object.values(updates).filter(v => v !== undefined);
      values.push(experienceId);

      const result = await this.db.query(
        `UPDATE candidate_experience SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Experience entry not found');
      }

      logger.info(`Experience entry ${experienceId} updated`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating experience:', error);
      throw error;
    }
  }

  /**
   * Delete experience entry
   */
  async deleteExperience(experienceId: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM candidate_experience WHERE id = $1',
        [experienceId]
      );

      if (result.rowCount === 0) {
        throw new Error('Experience entry not found');
      }

      logger.info(`Experience entry ${experienceId} deleted`);
    } catch (error) {
      logger.error('Error deleting experience:', error);
      throw error;
    }
  }

  /**
   * Search candidates by location, skills, etc.
   */
  async searchCandidates(
    country?: string,
    city?: string,
    yearsOfExperience?: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ candidates: any[]; total: number }> {
    try {
      let query = 'SELECT * FROM candidate_profiles WHERE visibility = $1';
      const params: any[] = ['public'];

      if (country) {
        query += ` AND country = $${params.length + 1}`;
        params.push(country);
      }

      if (city) {
        query += ` AND city = $${params.length + 1}`;
        params.push(city);
      }

      if (yearsOfExperience !== undefined) {
        query += ` AND years_of_experience >= $${params.length + 1}`;
        params.push(yearsOfExperience);
      }

      // Get total count
      const countResult = await this.db.query(
        query.replace('SELECT *', 'SELECT COUNT(*) as count'),
        params
      );

      // Get paginated results
      const offset = (page - 1) * limit;
      query += ` ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await this.db.query(query, params);

      return {
        candidates: result.rows,
        total: parseInt(countResult.rows[0].count),
      };
    } catch (error) {
      logger.error('Error searching candidates:', error);
      throw error;
    }
  }

  /**
   * Get candidate status
   */
  async getCandidateStatus(userId: string): Promise<string> {
    try {
      const result = await this.db.query(
        'SELECT status FROM candidate_profiles WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Candidate not found');
      }

      return result.rows[0].status;
    } catch (error) {
      logger.error('Error getting candidate status:', error);
      throw error;
    }
  }

  /**
   * Update candidate status
   */
  async updateCandidateStatus(userId: string, status: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE candidate_profiles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [status, userId]
      );

      logger.info(`Candidate status updated to ${status} for user ${userId}`);
    } catch (error) {
      logger.error('Error updating candidate status:', error);
      throw error;
    }
  }
}
