import axios from 'axios';

interface CandidateProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  profilePicture?: string;
  headline?: string;
  yearsOfExperience: number;
  skills: string[];
  certifications?: string[];
}

interface Education {
  id: string;
  candidateId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade?: string;
  activities?: string;
}

interface Experience {
  id: string;
  candidateId: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  currentlyWorking: boolean;
}

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

class CandidateService {
  private getAuthConfig(contentType: string = 'application/json') {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      headers: {
        'Content-Type': contentType,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    };
  }

  /**
   * Get candidate profile
   */
  async getProfile(): Promise<CandidateProfile> {
    try {
      const response = await axios.get(`${API_BASE}/candidates/profile`, this.getAuthConfig());
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  /**
   * Update candidate profile
   */
  async updateProfile(data: Partial<CandidateProfile>): Promise<CandidateProfile> {
    try {
      const response = await axios.put(`${API_BASE}/candidates/profile`, data, this.getAuthConfig());
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<{ url: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_BASE}/candidates/profile-picture`,
        formData,
        this.getAuthConfig('multipart/form-data')
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }

  /**
   * Add education
   */
  async addEducation(data: Omit<Education, 'id' | 'candidateId'>): Promise<Education> {
    try {
      const response = await axios.post(
        `${API_BASE}/candidates/education`,
        data,
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error adding education:', error);
      throw error;
    }
  }

  /**
   * Get all education records
   */
  async getEducation(): Promise<Education[]> {
    try {
      const response = await axios.get(`${API_BASE}/candidates/education`, this.getAuthConfig());

      return response.data.education || [];
    } catch (error) {
      console.error('Error fetching education:', error);
      throw error;
    }
  }

  /**
   * Update education
   */
  async updateEducation(
    educationId: string,
    data: Partial<Education>
  ): Promise<Education> {
    try {
      const response = await axios.put(
        `${API_BASE}/candidates/education/${educationId}`,
        data,
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error updating education:', error);
      throw error;
    }
  }

  /**
   * Delete education
   */
  async deleteEducation(educationId: string): Promise<{ message: string }> {
    try {
      const response = await axios.delete(`${API_BASE}/candidates/education/${educationId}`, this.getAuthConfig());

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error deleting education:', error);
      throw error;
    }
  }

  /**
   * Add work experience
   */
  async addExperience(data: Omit<Experience, 'id' | 'candidateId'>): Promise<Experience> {
    try {
      const response = await axios.post(
        `${API_BASE}/candidates/experience`,
        data,
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error adding experience:', error);
      throw error;
    }
  }

  /**
   * Get all work experience
   */
  async getExperience(): Promise<Experience[]> {
    try {
      const response = await axios.get(`${API_BASE}/candidates/experience`, this.getAuthConfig());

      return response.data.experience || [];
    } catch (error) {
      console.error('Error fetching experience:', error);
      throw error;
    }
  }

  /**
   * Update work experience
   */
  async updateExperience(
    experienceId: string,
    data: Partial<Experience>
  ): Promise<Experience> {
    try {
      const response = await axios.put(
        `${API_BASE}/candidates/experience/${experienceId}`,
        data,
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error updating experience:', error);
      throw error;
    }
  }

  /**
   * Delete work experience
   */
  async deleteExperience(experienceId: string): Promise<{ message: string }> {
    try {
      const response = await axios.delete(`${API_BASE}/candidates/experience/${experienceId}`, this.getAuthConfig());

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error deleting experience:', error);
      throw error;
    }
  }

  /**
   * Add skill
   */
  async addSkill(skill: string): Promise<{ skills: string[] }> {
    try {
      const response = await axios.post(
        `${API_BASE}/candidates/skills`,
        { skill },
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error adding skill:', error);
      throw error;
    }
  }

  /**
   * Remove skill
   */
  async removeSkill(skill: string): Promise<{ skills: string[] }> {
    try {
      const response = await axios.delete(
        `${API_BASE}/candidates/skills/${encodeURIComponent(skill)}`,
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error removing skill:', error);
      throw error;
    }
  }

  /**
   * Get candidate by ID (for employer/admin view)
   */
  async getCandidateById(candidateId: string): Promise<CandidateProfile> {
    try {
      const response = await axios.get(`${API_BASE}/candidates/${candidateId}`, this.getAuthConfig());

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error fetching candidate:', error);
      throw error;
    }
  }
}

export default new CandidateService();
