/**
 * Certification API Service
 * Handles all certification-related API communication
 */

import axios, { AxiosInstance } from 'axios';

interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  startedAt: Date;
  status: 'in-progress' | 'completed' | 'abandoned';
  score?: number;
  timeSpent?: number;
}

interface AssessmentResult {
  attemptId: string;
  score: number;
  isPassed: boolean;
  timeSpent: number;
  feedback: string;
  recommendations: string[];
}

interface Certification {
  id: string;
  skillId: string;
  earnedDate: Date;
  expiryDate?: Date;
  level: string;
  credentialUrl: string;
}

interface PortfolioItem {
  id: string;
  type: string;
  title: string;
  description: string;
  links?: Record<string, string>;
}

interface Portfolio {
  id: string;
  title: string;
  bio: string;
  items: PortfolioItem[];
  published: boolean;
  publicUrl?: string;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  level: string;
}

export type CertificationServiceType = {
  // Assessment methods
  startAssessment(assessmentId: string): Promise<AssessmentAttempt>;
  submitAssessment(attemptId: string, answers: Record<string, string>): Promise<AssessmentResult>;
  getAssessmentAttempt(attemptId: string): Promise<AssessmentAttempt>;
  getAssessmentHistory(userId: string): Promise<AssessmentAttempt[]>;

  // Certification methods
  getCertifications(userId: string): Promise<Certification[]>;
  getCertification(certId: string): Promise<Certification>;
  verifyCertification(token: string): Promise<{ isValid: boolean }>;
  shareCredential(certId: string): Promise<{ shareUrl: string; token: string }>;

  // Portfolio methods
  getPortfolio(userId: string): Promise<Portfolio>;
  updatePortfolio(userId: string, data: Partial<Portfolio>): Promise<Portfolio>;
  publishPortfolio(portfolioId: string): Promise<Portfolio>;
  addPortfolioItem(portfolioId: string, item: Partial<PortfolioItem>): Promise<PortfolioItem>;
  updatePortfolioItem(portfolioId: string, itemId: string, data: Partial<PortfolioItem>): Promise<PortfolioItem>;
  removePortfolioItem(portfolioId: string, itemId: string): Promise<void>;

  // Badge methods
  listBadges(skillId?: string): Promise<BadgeDefinition[]>;
  checkBadgeEligibility(badgeId: string): Promise<{ eligible: boolean; missing: string[] }>;
  getBadgeProgress(badgeId: string): Promise<{ overall: number; details: Record<string, any> }>;

  // Endorsement methods
  endorseSkill(userId: string, skillId: string, message?: string): Promise<{ id: string }>;
  removeEndorsement(endorsementId: string): Promise<void>;
  getSkillProfile(userId: string): Promise<{ skills: any[]; endorsements: number; trustScore: number }>;
};

export const createCertificationService = (baseURL: string): CertificationServiceType => {
  const client: AxiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return {
    // Assessment methods
    async startAssessment(assessmentId: string): Promise<AssessmentAttempt> {
      const { data } = await client.post(`/assessments/${assessmentId}/start`);
      return data;
    },

    async submitAssessment(attemptId: string, answers: Record<string, string>): Promise<AssessmentResult> {
      const { data } = await client.post(`/assessments/attempts/${attemptId}/submit`, { answers });
      return data;
    },

    async getAssessmentAttempt(attemptId: string): Promise<AssessmentAttempt> {
      const { data } = await client.get(`/assessments/attempts/${attemptId}`);
      return data;
    },

    async getAssessmentHistory(userId: string): Promise<AssessmentAttempt[]> {
      const { data } = await client.get(`/users/${userId}/assessments`);
      return data;
    },

    // Certification methods
    async getCertifications(userId: string): Promise<Certification[]> {
      const { data } = await client.get(`/users/${userId}/certifications`);
      return data;
    },

    async getCertification(certId: string): Promise<Certification> {
      const { data } = await client.get(`/certifications/${certId}`);
      return data;
    },

    async verifyCertification(token: string): Promise<{ isValid: boolean }> {
      const { data } = await client.get(`/certifications/verify/${token}`);
      return data;
    },

    async shareCredential(certId: string): Promise<{ shareUrl: string; token: string }> {
      const { data } = await client.post(`/certifications/${certId}/share`);
      return data;
    },

    // Portfolio methods
    async getPortfolio(userId: string): Promise<Portfolio> {
      const { data } = await client.get(`/users/${userId}/portfolio`);
      return data;
    },

    async updatePortfolio(userId: string, portfolioData: Partial<Portfolio>): Promise<Portfolio> {
      const { data } = await client.put(`/users/${userId}/portfolio`, portfolioData);
      return data;
    },

    async publishPortfolio(portfolioId: string): Promise<Portfolio> {
      const { data } = await client.post(`/portfolios/${portfolioId}/publish`);
      return data;
    },

    async addPortfolioItem(portfolioId: string, item: Partial<PortfolioItem>): Promise<PortfolioItem> {
      const { data } = await client.post(`/portfolios/${portfolioId}/items`, item);
      return data;
    },

    async updatePortfolioItem(portfolioId: string, itemId: string, itemData: Partial<PortfolioItem>): Promise<PortfolioItem> {
      const { data } = await client.put(`/portfolios/${portfolioId}/items/${itemId}`, itemData);
      return data;
    },

    async removePortfolioItem(portfolioId: string, itemId: string): Promise<void> {
      await client.delete(`/portfolios/${portfolioId}/items/${itemId}`);
    },

    // Badge methods
    async listBadges(skillId?: string): Promise<BadgeDefinition[]> {
      const { data } = await client.get('/badges', { params: { skillId } });
      return data;
    },

    async checkBadgeEligibility(badgeId: string): Promise<{ eligible: boolean; missing: string[] }> {
      const { data } = await client.get(`/badges/${badgeId}/eligibility`);
      return data;
    },

    async getBadgeProgress(badgeId: string): Promise<{ overall: number; details: Record<string, any> }> {
      const { data } = await client.get(`/badges/${badgeId}/progress`);
      return data;
    },

    // Endorsement methods
    async endorseSkill(userId: string, skillId: string, message?: string): Promise<{ id: string }> {
      const { data } = await client.post(`/users/${userId}/skills/${skillId}/endorse`, { message });
      return data;
    },

    async removeEndorsement(endorsementId: string): Promise<void> {
      await client.delete(`/endorsements/${endorsementId}`);
    },

    async getSkillProfile(userId: string): Promise<{ skills: any[]; endorsements: number; trustScore: number }> {
      const { data } = await client.get(`/users/${userId}/skill-profile`);
      return data;
    },
  };
};
