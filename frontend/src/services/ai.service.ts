/**
 * AI Service (Frontend)
 * Handles API calls to backend AI endpoints
 */

import axios, { AxiosInstance } from 'axios';

export interface JobMatchResult {
  matchPercentage: number;
  matchedSkills: Array<{ skill: string; matched: boolean; importance: string }>;
  missingSkills: Array<{ skill: string; matched: boolean; importance: string }>;
  summary: string;
  recommendations: string[];
}

export interface SalaryPrediction {
  min: number;
  max: number;
  currency: string;
}

class AIService {
  private api: AxiosInstance;
  private apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  private baseURL = this.apiOrigin.endsWith('/api') ? this.apiOrigin : `${this.apiOrigin}/api`;

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Upload and analyze resume
   */
  async analyzeResume(file: File): Promise<{
    extractedSkills: string[];
    sections: any;
    analysis: any;
  }> {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await this.api.post('/ai/analyze-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Calculate job match score
   */
  async matchJob(jobId: string, resumeSkills: string[]): Promise<JobMatchResult> {
    const response = await this.api.post('/ai/match-job', {
      jobId,
      resumeSkills,
    });

    return response.data.data;
  }

  /**
   * Generate interview questions for a job
   */
  async generateInterviewQuestions(jobId: string): Promise<string[]> {
    const response = await this.api.post('/ai/interview-prep', {
      jobId,
    });

    return response.data.data.questions;
  }

  /**
   * Generate personalized cover letter
   */
  async generateCoverLetter(
    jobId: string,
    candidateName: string,
    companyName: string,
    skills: string[] = []
  ): Promise<string> {
    const response = await this.api.post('/ai/cover-letter', {
      jobId,
      candidateName,
      companyName,
      skills,
    });

    return response.data.data.coverLetter;
  }

  /**
   * Get skill recommendations for a job
   */
  async getSkillRecommendations(jobId: string, currentSkills: string[]): Promise<string[]> {
    const response = await this.api.post('/ai/skill-recommendations', {
      jobId,
      currentSkills,
    });

    return response.data.data.recommendations;
  }

  /**
   * Predict salary range
   */
  async predictSalary(
    skills: string[],
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead',
    location: string
  ): Promise<SalaryPrediction> {
    const response = await this.api.post('/ai/salary-prediction', {
      skills,
      experienceLevel,
      location,
    });

    return response.data.data;
  }
}

export const aiService = new AIService();
