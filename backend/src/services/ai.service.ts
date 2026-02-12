/**
 * AI Service - Skill Extraction & Job Matching
 * Uses Hugging Face models for NER (Named Entity Recognition)
 * Calculates job-resume match scores
 */

import { logger } from '@/utils/logger';
import { resumeParserService } from './resume.parser.service';

export interface SkillMatch {
  skill: string;
  matched: boolean;
  importance: 'critical' | 'important' | 'nice-to-have';
}

export interface JobMatchResult {
  matchPercentage: number;
  matchedSkills: SkillMatch[];
  missingSkills: SkillMatch[];
  summary: string;
  recommendations: string[];
}

class AIService {
  /**
   * Extract skills from resume text using keyword extraction
   * In production, integrate with Hugging Face HuggingFace pipeline for better NER
   */
  async extractSkillsFromResume(resumeText: string): Promise<string[]> {
    try {
      const skills = await resumeParserService.extractSkillsFromText(resumeText);
      logger.info(`Extracted ${skills.length} skills from resume`);
      return skills;
    } catch (error) {
      logger.error('Error extracting skills:', error);
      return [];
    }
  }

  /**
   * Calculate job match score
   * Compares resume skills with job requirements
   */
  async calculateJobMatch(
    resumeSkills: string[],
    jobTitle: string,
    jobDescription: string,
    requiredSkills: string[]
  ): Promise<JobMatchResult> {
    try {
      // Normalize skills
      const normalizedResumeSkills = resumeSkills.map(s => s.toLowerCase());
      const normalizedRequired = requiredSkills.map(s => s.toLowerCase());

      // Categorize job requirements by importance
      const criticalSkills = this.extractCriticalSkills(jobDescription);
      const importantSkills = normalizedRequired.filter(s => !criticalSkills.includes(s));

      // Calculate matches
      const matchedCritical = criticalSkills.filter(s =>
        normalizedResumeSkills.some(rs => rs.includes(s) || s.includes(rs))
      );

      const matchedImportant = importantSkills.filter(s =>
        normalizedResumeSkills.some(rs => rs.includes(s) || s.includes(rs))
      );

      // Build result
      const matchedSkills: SkillMatch[] = [
        ...matchedCritical.map(s => ({ skill: s, matched: true, importance: 'critical' as const })),
        ...matchedImportant.map(s => ({ skill: s, matched: true, importance: 'important' as const }))
      ];

      const missingCritical = criticalSkills.filter(s => !matchedCritical.includes(s));
      const missingImportant = importantSkills.filter(s => !matchedImportant.includes(s));

      const missingSkills: SkillMatch[] = [
        ...missingCritical.map(s => ({ skill: s, matched: false, importance: 'critical' as const })),
        ...missingImportant.map(s => ({ skill: s, matched: false, importance: 'important' as const }))
      ];

      // Calculate match percentage
      const totalRequired = requiredSkills.length;
      const totalMatched = matchedSkills.length;
      const matchPercentage = totalRequired > 0 ? Math.round((totalMatched / totalRequired) * 100) : 0;

      // Generate summary and recommendations
      const summary = this.generateMatchSummary(matchPercentage, jobTitle, matchedCritical.length, criticalSkills.length);
      const recommendations = this.generateRecommendations(missingSkills, resumeSkills);

      return {
        matchPercentage,
        matchedSkills,
        missingSkills,
        summary,
        recommendations
      };
    } catch (error) {
      logger.error('Error calculating job match:', error);
      return {
        matchPercentage: 0,
        matchedSkills: [],
        missingSkills: [],
        summary: 'Unable to calculate match',
        recommendations: []
      };
    }
  }

  /**
   * Extract critical skills from job description
   * Uses keyword analysis to identify must-have skills
   */
  private extractCriticalSkills(jobDescription: string): string[] {
    const criticalKeywords = [
      'required', 'must have', 'essential', 'mandatory', 'critical',
      'proficiency', 'expertise', 'years of experience'
    ];

    const lowerDesc = jobDescription.toLowerCase();
    const critical: Set<string> = new Set();

    // Look for "Required skills" sections
    const requiredMatch = jobDescription.match(/required.*?(?:skills|qualifications)[\s\S]*?(?:\n\n|$)/i);
    if (requiredMatch) {
      const skills = this.parseSkillsList(requiredMatch[0]);
      skills.forEach(s => critical.add(s));
    }

    return Array.from(critical);
  }

  /**
   * Parse skill list from text
   */
  private parseSkillsList(text: string): string[] {
    const skills: Set<string> = new Set();
    
    // Look for bullet points and comma-separated lists
    const lines = text.split(/[\n,]/);
    
    for (const line of lines) {
      const cleaned = line.replace(/^[\s•\-*]+/, '').trim();
      if (cleaned.length > 0 && cleaned.length < 50) {
        // Extract potential skill
        const skill = cleaned.split(/\(|\/|\[/)[0].trim();
        if (skill.length > 2) {
          skills.add(skill);
        }
      }
    }

    return Array.from(skills);
  }

  /**
   * Generate human-readable match summary
   */
  private generateMatchSummary(
    percentage: number,
    jobTitle: string,
    matchedCritical: number,
    totalCritical: number
  ): string {
    if (percentage >= 90) {
      return `Excellent match! You have ${matchedCritical}/${totalCritical} critical skills for this ${jobTitle} role.`;
    } else if (percentage >= 75) {
      return `Good match! You have most required skills for this ${jobTitle} position. Consider developing the missing skills.`;
    } else if (percentage >= 60) {
      return `Moderate match for ${jobTitle}. You have some relevant skills but would benefit from learning ${totalCritical - matchedCritical} more.`;
    } else {
      return `Limited match. You may want to develop more skills before applying for this ${jobTitle} role.`;
    }
  }

  /**
   * Generate skill development recommendations
   */
  private generateRecommendations(missingSkills: SkillMatch[], resumeSkills: string[]): string[] {
    const recommendations: string[] = [];

    // Recommend critical missing skills
    const criticalMissing = missingSkills
      .filter(s => s.importance === 'critical')
      .slice(0, 3);

    if (criticalMissing.length > 0) {
      recommendations.push(
        `Prioritize learning: ${criticalMissing.map(s => s.skill).join(', ')}`
      );
    }

    // Suggest complementary skills
    if (resumeSkills.length > 0) {
      recommendations.push(
        `Build on your existing ${resumeSkills[0]} knowledge with complementary tools`
      );
    }

    // Generic recommendations
    if (recommendations.length === 0) {
      recommendations.push('Consider online courses to develop relevant skills');
      recommendations.push('Look for projects that align with job requirements');
    }

    return recommendations;
  }

  /**
   * Get salary prediction for candidate
   * Based on skills, experience level, and location
   */
  async predictSalaryRange(
    skills: string[],
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead',
    location: string
  ): Promise<{ min: number; max: number; currency: string }> {
    try {
      // Base salaries by experience (in USD, adjust per your market)
      const baseSalaries: Record<string, { min: number; max: number }> = {
        'entry': { min: 50000, max: 70000 },
        'mid': { min: 75000, max: 100000 },
        'senior': { min: 110000, max: 150000 },
        'lead': { min: 160000, max: 200000 }
      };

      let base = baseSalaries[experienceLevel] || baseSalaries['mid'];

      // Adjust for high-demand skills
      const premiumSkills = ['AI/ML', 'Kubernetes', 'Cloud Architecture', 'System Design'];
      const hasPremiumSkill = skills.some(s =>
        premiumSkills.some(p => s.toLowerCase().includes(p.toLowerCase()))
      );

      if (hasPremiumSkill) {
        base.min = Math.round(base.min * 1.15);
        base.max = Math.round(base.max * 1.15);
      }

      // Location multiplier (simplified)
      const locationMultipliers: Record<string, number> = {
        'san francisco': 1.4,
        'new york': 1.35,
        'seattle': 1.3,
        'london': 1.2,
        'toronto': 1.1,
        'default': 1.0
      };

      const multiplier = locationMultipliers[location.toLowerCase()] || 1.0;
      base.min = Math.round(base.min * multiplier);
      base.max = Math.round(base.max * multiplier);

      return {
        min: base.min,
        max: base.max,
        currency: 'USD'
      };
    } catch (error) {
      logger.error('Error predicting salary:', error);
      return { min: 50000, max: 100000, currency: 'USD' };
    }
  }
}

export const aiService = new AIService();
