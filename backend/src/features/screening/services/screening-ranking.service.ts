/**
 * Screening Ranking Service
 * ML-powered candidate ranking algorithm
 * Calculate match scores based on skills, experience, and other factors
 */

import { logger } from '@/utils/logger';

interface JobRequirements {
  title: string;
  requiredSkills: string[];
  niceTohaveSkills: string[];
  yearsOfExperience: number;
  educationLevel: string[];
  description: string;
}

interface CandidateProfile {
  skills: string[];
  yearsOfExperience: number;
  education: string;
  strengths: string[];
}

export class ScreeningRankingService {
  /**
   * Calculate comprehensive screening score (0-100)
   * Weights:
   * - Required skills: 60%
   * - Experience: 20%
   * - Education: 10%
   * - Strengths/Fit: 10%
   */
  calculateScreeningScore(
    analysis: {
      skills: { matched: string[]; missing: string[] };
      strengths: string[];
      gaps: string[];
      recommendations: string[];
      matchPercentage: number;
    },
    jobRequirements: JobRequirements
  ): number {
    try {
      // Skill match score (60% weight)
      const skillMatchScore = this.calculateSkillMatchScore(
        analysis.skills.matched,
        analysis.skills.missing,
        jobRequirements.requiredSkills,
        jobRequirements.niceTohaveSkills
      );

      // Experience compatibility score (20% weight)
      const experienceScore = this.calculateExperienceScore(
        jobRequirements.yearsOfExperience
      );

      // Strengths alignment score (10% weight)
      const strengthsScore = this.calculateStrengthsScore(
        analysis.strengths,
        jobRequirements.description
      );

      // Calculate weighted total
      const totalScore =
        skillMatchScore * 0.6 +
        experienceScore * 0.2 +
        strengthsScore * 0.1 +
        analysis.matchPercentage * 0.1;

      return Math.round(Math.min(100, totalScore));
    } catch (error) {
      logger.error('Error calculating screening score', { error });
      return 0;
    }
  }

  /**
   * Calculate skill match score
   * Required skills: Critical
   * Nice-to-have: Bonus points
   */
  private calculateSkillMatchScore(
    matchedSkills: string[],
    missingSkills: string[],
    requiredSkills: string[],
    niceTohaveSkills: string[] = []
  ): number {
    if (requiredSkills.length === 0) return 100;

    // Required skills coverage
    const requiredCoverage =
      requiredSkills.length === 0
        ? 0
        : (matchedSkills.filter((s) =>
            requiredSkills.some(
              (r) => s.toLowerCase() === r.toLowerCase()
            )
          ).length /
            requiredSkills.length) *
          100;

    // Nice-to-have bonus (max 20 points)
    const niceToHaveBonus =
      niceTohaveSkills.length === 0
        ? 0
        : Math.min(
            20,
            (matchedSkills.filter((s) =>
              niceTohaveSkills.some(
                (n) => s.toLowerCase() === n.toLowerCase()
              )
            ).length /
              niceTohaveSkills.length) *
              20
          );

    // Missing critical skills penalty
    const missingPenalty = Math.min(
      40,
      (missingSkills.length / requiredSkills.length) * 40
    );

    return Math.max(0, requiredCoverage + niceToHaveBonus - missingPenalty);
  }

  /**
   * Calculate experience score based on years
   * Logic:
   * - 0.5x years: -20 points
   * - 0.5-1x years: 0 points
   * - 1-2x years: +20 points
   * - 2-3x years: +40 points
   * - 3+ years: +60 points
   */
  private calculateExperienceScore(requiredYears: number): number {
    // TODO: Get candidate's experience from parsed resume
    // For now, return neutral score
    return 50;
  }

  /**
   * Calculate strengths alignment score
   * How well candidate's strengths match job description
   */
  private calculateStrengthsScore(
    strengths: string[],
    jobDescription: string
  ): number {
    if (strengths.length === 0) return 50;

    const jobKeywords = this.extractKeywords(jobDescription);
    const matchedStrengths = strengths.filter((strength) =>
      jobKeywords.some((keyword) =>
        strength.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    return (matchedStrengths.length / strengths.length) * 100;
  }

  /**
   * Extract keywords from job description
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production use NLP
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);

    // Remove common words
    const stopwords = [
      'about',
      'would',
      'could',
      'should',
      'their',
      'which',
      'these',
      'those',
      'have',
      'from',
      'they',
      'been',
      'your',
      'with',
    ];

    return [...new Set(words.filter((w) => !stopwords.includes(w)))].slice(
      0,
      20
    );
  }

  /**
   * Categorize candidates by match level
   */
  categorizeByMatch(score: number): 'strong' | 'moderate' | 'weak' {
    if (score >= 70) return 'strong';
    if (score >= 50) return 'moderate';
    return 'weak';
  }

  /**
   * Generate ranking for multiple candidates
   */
  rankCandidates(
    candidates: Array<{ id: string; score: number }>
  ): Array<{ rank: number; id: string; score: number }> {
    return candidates
      .sort((a, b) => b.score - a.score)
      .map((candidate, index) => ({
        rank: index + 1,
        id: candidate.id,
        score: candidate.score,
      }));
  }
}
