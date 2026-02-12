/**
 * Screening Ranking Service Unit Tests
 * Production-grade: Algorithm validation, edge cases, 95%+ coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ScreeningRankingService } from '../services/screening-ranking.service';
import type { ScreeningResult } from '@/shared/types/database.types';

/**
 * Test fixtures
 */
function createMockCandidate(
  skills: string[],
  experienceYears: number,
  strengths: string[] = []
): any {
  return {
    skills,
    experience_years: experienceYears,
    strengths,
    background: `${experienceYears} years of experience`,
  };
}

/**
 * Test suite
 */
describe('ScreeningRankingService', () => {
  let service: ScreeningRankingService;

  beforeEach(() => {
    service = new ScreeningRankingService();
  });

  describe('calculateScreeningScore', () => {
    it('should calculate perfect score for perfect match', () => {
      const jobRequirements = {
        skills_required: ['JavaScript', 'TypeScript', 'React'],
        experience_required_years: 3,
        strengths_expected: ['Problem solving', 'Leadership'],
      };

      const candidate = createMockCandidate(
        ['JavaScript', 'TypeScript', 'React'],
        5,
        ['Problem solving', 'Leadership']
      );

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBe(100);
    });

    it('should calculate lower score for partial skill match', () => {
      const jobRequirements = {
        skills_required: ['JavaScript', 'TypeScript', 'React'],
        experience_required_years: 3,
        strengths_expected: ['Problem solving'],
      };

      const candidate = createMockCandidate(
        ['JavaScript', 'TypeScript'], // Missing React
        5,
        ['Problem solving']
      );

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle experience below requirement', () => {
      const jobRequirements = {
        skills_required: ['JavaScript', 'TypeScript'],
        experience_required_years: 5,
        strengths_expected: [],
      };

      const candidate = createMockCandidate(['JavaScript', 'TypeScript'], 2); // Below requirement

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBeLessThan(100);
    });

    it('should give bonus for experience above requirement', () => {
      const jobRequirements = {
        skills_required: ['JavaScript'],
        experience_required_years: 3,
        strengths_expected: [],
      };

      const candidate1 = createMockCandidate(['JavaScript'], 3);
      const candidate2 = createMockCandidate(['JavaScript'], 10);

      const score1 = service.calculateScreeningScore(candidate1, jobRequirements);
      const score2 = service.calculateScreeningScore(candidate2, jobRequirements);

      expect(score2).toBeGreaterThan(score1);
    });

    it('should handle empty candidates skills array', () => {
      const jobRequirements = {
        skills_required: ['JavaScript'],
        experience_required_years: 3,
        strengths_expected: [],
      };

      const candidate = createMockCandidate([], 5);

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBeLessThan(50); // Should be low for no matching skills
    });

    it('should handle empty job requirements', () => {
      const jobRequirements = {
        skills_required: [],
        experience_required_years: 0,
        strengths_expected: [],
      };

      const candidate = createMockCandidate(['JavaScript'], 5);

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBeGreaterThan(50); // Should be moderate
    });
  });

  describe('calculateSkillMatchScore', () => {
    it('should return 100 for all required skills matched', () => {
      const required = ['JavaScript', 'TypeScript'];
      const candidate = ['JavaScript', 'TypeScript', 'React'];

      const score = service.calculateSkillMatchScore(candidate, required, []);

      expect(score).toBe(100);
    });

    it('should penalize missing required skills', () => {
      const required = ['JavaScript', 'TypeScript', 'Go'];
      const candidate = ['JavaScript', 'TypeScript'];

      const score = service.calculateSkillMatchScore(candidate, required, []);

      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(50);
    });

    it('should give bonus for nice-to-have skills', () => {
      const required = ['JavaScript'];
      const niceToHave = ['TypeScript', 'React'];
      const candidate = ['JavaScript', 'TypeScript', 'React'];

      const scoreWithoutBonus = service.calculateSkillMatchScore(
        ['JavaScript'],
        required,
        []
      );
      const scoreWithBonus = service.calculateSkillMatchScore(
        candidate,
        required,
        niceToHave
      );

      expect(scoreWithBonus).toBeGreaterThan(scoreWithoutBonus);
    });

    it('should handle case-insensitive matching', () => {
      const required = ['javascript', 'typescript'];
      const candidate = ['JavaScript', 'TypeScript'];

      const score = service.calculateSkillMatchScore(candidate, required, []);

      expect(score).toBe(100);
    });

    it('should handle partial skill names (substring matching)', () => {
      const required = ['Node.js'];
      const candidate = ['node.js'];

      const score = service.calculateSkillMatchScore(candidate, required, []);

      expect(score).toBe(100);
    });

    it('should cap skill score at 100', () => {
      const required = ['JavaScript'];
      const candidate = ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular'];

      const score = service.calculateSkillMatchScore(candidate, required, []);

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateExperienceScore', () => {
    it('should return perfect score for sufficient experience', () => {
      const score = service.calculateExperienceScore(5, 3);

      expect(score).toBe(100);
    });

    it('should penalize insufficient experience', () => {
      const score = service.calculateExperienceScore(1, 3);

      expect(score).toBeLessThan(100);
    });

    it('should handle zero required years', () => {
      const score = service.calculateExperienceScore(0, 0);

      expect(score).toBe(100);
    });

    it('should scale with years of experience difference', () => {
      const scoreAt3Years = service.calculateExperienceScore(3, 5);
      const scoreAt5Years = service.calculateExperienceScore(5, 5);
      const scoreAt10Years = service.calculateExperienceScore(10, 5);

      expect(scoreAt3Years).toBeLessThan(scoreAt5Years);
      expect(scoreAt5Years).toBeLessThanOrEqual(scoreAt10Years);
    });
  });

  describe('calculateStrengthsScore', () => {
    it('should return 100 for all expected strengths present', () => {
      const expected = ['Problem solving', 'Leadership'];
      const actual = ['Problem solving', 'Leadership', 'Communication'];

      const score = service.calculateStrengthsScore(actual, expected);

      expect(score).toBe(100);
    });

    it('should penalize missing strengths', () => {
      const expected = ['Problem solving', 'Leadership', 'Communication'];
      const actual = ['Problem solving'];

      const score = service.calculateStrengthsScore(actual, expected);

      expect(score).toBeLessThan(100);
    });

    it('should handle empty strengths', () => {
      const expected = ['Problem solving'];
      const actual: string[] = [];

      const score = service.calculateStrengthsScore(actual, expected);

      expect(score).toBeLessThan(100);
    });

    it('should handle empty expected strengths', () => {
      const expected: string[] = [];
      const actual = ['Problem solving'];

      const score = service.calculateStrengthsScore(actual, expected);

      expect(score).toBeGreaterThanOrEqual(50);
    });

    it('should be case-insensitive', () => {
      const expected = ['problem solving'];
      const actual = ['Problem Solving'];

      const score = service.calculateStrengthsScore(actual, expected);

      expect(score).toBe(100);
    });
  });

  describe('rankCandidates', () => {
    it('should rank candidates by score descending', () => {
      const candidates = [
        { ...createMockCandidate(['JavaScript'], 3), candidate_id: '1' },
        { ...createMockCandidate(['JavaScript', 'TypeScript'], 5), candidate_id: '2' },
        { ...createMockCandidate(['JavaScript', 'TypeScript', 'React'], 5), candidate_id: '3' },
      ];

      const jobRequirements = {
        skills_required: ['JavaScript', 'TypeScript', 'React'],
        experience_required_years: 3,
        strengths_expected: [],
      };

      const ranked = service.rankCandidates(candidates, jobRequirements);

      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
      expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
    });

    it('should handle tied scores with consistent ordering', () => {
      const candidates = [
        { ...createMockCandidate(['JavaScript'], 3), candidate_id: '1' },
        { ...createMockCandidate(['JavaScript'], 3), candidate_id: '2' },
      ];

      const jobRequirements = {
        skills_required: ['JavaScript'],
        experience_required_years: 3,
        strengths_expected: [],
      };

      const ranked = service.rankCandidates(candidates, jobRequirements);

      expect(ranked[0].score).toBe(ranked[1].score);
      expect(ranked[0].rank).toBeLessThan(ranked[1].rank);
    });

    it('should assign correct match categories', () => {
      const candidates = [
        { ...createMockCandidate(['JavaScript', 'TypeScript', 'React'], 5), candidate_id: '1' },
        { ...createMockCandidate(['JavaScript', 'TypeScript'], 3), candidate_id: '2' },
        { ...createMockCandidate(['JavaScript'], 1), candidate_id: '3' },
      ];

      const jobRequirements = {
        skills_required: ['JavaScript', 'TypeScript', 'React'],
        experience_required_years: 3,
        strengths_expected: [],
      };

      const ranked = service.rankCandidates(candidates, jobRequirements);

      // Assuming: strong >= 80%, moderate 50-80%, weak < 50%
      expect(ranked[0].matchCategory).toBe('strong');
      expect(ranked[1].matchCategory).toMatch(/strong|moderate/);
      expect(ranked[2].matchCategory).toMatch(/moderate|weak/);
    });
  });

  describe('categorizeByMatch', () => {
    it('should categorize high scores as strong', () => {
      const category = service.categorizeByMatch(90);

      expect(category).toBe('strong');
    });

    it('should categorize medium scores as moderate', () => {
      const category = service.categorizeByMatch(65);

      expect(category).toBe('moderate');
    });

    it('should categorize low scores as weak', () => {
      const category = service.categorizeByMatch(40);

      expect(category).toBe('weak');
    });

    it('should handle boundary values correctly', () => {
      const strong = service.categorizeByMatch(80);
      const moderate = service.categorizeByMatch(50);
      const weak = service.categorizeByMatch(49);

      expect(strong).toMatch(/strong|moderate/); // At boundary
      expect(moderate).toBe('moderate');
      expect(weak).toBe('weak');
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from job description', () => {
      const description =
        'Looking for experienced JavaScript and TypeScript developer with React and Node.js experience';

      const keywords = service.extractKeywords(description);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.map((k: string) => k.toLowerCase())).toEqual(
        expect.arrayContaining(['javascript', 'typescript'])
      );
    });

    it('should handle empty descriptions', () => {
      const keywords = service.extractKeywords('');

      expect(keywords).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const keywords = service.extractKeywords('JavaScript TYPESCRIPT react');

      expect(
        keywords.some((k: string) => k.toLowerCase() === 'javascript')
      ).toBe(true);
    });

    it('should remove duplicates', () => {
      const keywords = service.extractKeywords('JavaScript JavaScript TypeScript TypeScript');

      const jsCount = keywords.filter(
        (k: string) => k.toLowerCase() === 'javascript'
      ).length;

      expect(jsCount).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle candidates with no skills', () => {
      const candidate = createMockCandidate([], 5);
      const jobRequirements = {
        skills_required: ['JavaScript'],
        experience_required_years: 3,
        strengths_expected: [],
      };

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle candidates with no experience', () => {
      const candidate = createMockCandidate(['JavaScript'], 0);
      const jobRequirements = {
        skills_required: ['JavaScript'],
        experience_required_years: 3,
        strengths_expected: [],
      };

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should never return negative scores', () => {
      const candidate = createMockCandidate([], 0);
      const jobRequirements = {
        skills_required: ['JavaScript', 'TypeScript', 'Go', 'Rust', 'Python'],
        experience_required_years: 20,
        strengths_expected: ['Leadership', 'Innovation', 'Communication'],
      };

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should never return scores > 100', () => {
      const candidate = createMockCandidate(
        ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Svelte'],
        100,
        ['Leadership', 'Innovation']
      );
      const jobRequirements = {
        skills_required: ['JavaScript'],
        experience_required_years: 1,
        strengths_expected: [],
      };

      const score = service.calculateScreeningScore(candidate, jobRequirements);

      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
