/**
 * Integration Tests: ML Prediction Accuracy & Validation
 * Tests machine learning model predictions for salary, skills, and job fit
 */

import { describe, it, beforeAll, afterAll } from '@jest/globals';
import { MLService } from '../../services/ml.service';
import { CareerPathwayService } from '../../services/career-pathway.service';
import { Database } from '../../config/database';
import { RedisCache } from '../../config/redis';

describe('ML Prediction Accuracy & Validation Tests', () => {
  let mlService: MLService;
  let careerService: CareerPathwayService;
  let db: Database;
  let cache: RedisCache;

  beforeAll(async () => {
    db = new Database();
    await db.connect();

    cache = new RedisCache();
    await cache.connect();

    mlService = new MLService(db, cache);
    careerService = new CareerPathwayService(db, cache);

    // Load pre-trained models
    await mlService.loadModels();
  });

  afterAll(async () => {
    await db.disconnect();
    await cache.disconnect();
  });

  describe('Salary Prediction Accuracy', () => {
    it('should predict salary within 10% of actual for known roles', async () => {
      const testCases = [
        {
          role: 'junior-engineer',
          yearsExp: 1,
          skills: ['javascript', 'react'],
          location: 'San Francisco',
          expectedSalary: 60000,
          tolerance: 0.1,
        },
        {
          role: 'mid-engineer',
          yearsExp: 4,
          skills: ['typescript', 'nodejs', 'databases'],
          location: 'New York',
          expectedSalary: 90000,
          tolerance: 0.1,
        },
        {
          role: 'senior-engineer',
          yearsExp: 8,
          skills: ['system-design', 'architecture', 'leadership'],
          location: 'San Francisco',
          expectedSalary: 140000,
          tolerance: 0.1,
        },
      ];

      for (const testCase of testCases) {
        const prediction = await mlService.predictSalary({
          role: testCase.role,
          yearsOfExperience: testCase.yearsExp,
          skills: testCase.skills,
          location: testCase.location,
        });

        const error = Math.abs(prediction.salary - testCase.expectedSalary) / testCase.expectedSalary;
        expect(error).toBeLessThan(testCase.tolerance);
        expect(prediction.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should track salary prediction errors for model retraining', async () => {
      const prediction = await mlService.predictSalary({
        role: 'engineer',
        yearsOfExperience: 5,
        skills: ['javascript'],
        location: 'Seattle',
      });

      const actual = 95000;

      await mlService.recordPredictionError({
        modelName: 'salary_prediction',
        predicted: prediction.salary,
        actual: actual,
        features: prediction.features,
      });

      // Verify error tracked
      const errors = await db.query(
        'SELECT * FROM ml_prediction_errors WHERE model_name = ? ORDER BY created_at DESC LIMIT 1',
        ['salary_prediction']
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].predicted).toBe(Math.round(prediction.salary));
      expect(errors[0].actual).toBe(actual);
    });

    it('should update predictions when actual salary data becomes available', async () => {
      const userId = 'test-user-123';

      // Initial prediction
      const initial = await mlService.predictSalary({
        role: 'junior-engineer',
        yearsOfExperience: 2,
        skills: ['javascript'],
        location: 'Remote',
      });

      expect(initial.confidence).toBeLessThan(1.0); // Not fully confident

      // Record actual salary
      await db.query(
        'INSERT INTO salary_records (user_id, role, salary, location, years_experience) VALUES (?, ?, ?, ?, ?)',
        [userId, 'junior-engineer', 65000, 'Remote', 2]
      );

      // Re-predict with actual data
      const updated = await mlService.predictSalary({
        role: 'junior-engineer',
        yearsOfExperience: 2,
        skills: ['javascript'],
        location: 'Remote',
        includeActualData: true,
      });

      // Confidence should increase with more data
      expect(updated.confidence).toBeGreaterThanOrEqual(initial.confidence);
    });
  });

  describe('Skill Gap Prediction', () => {
    it('should identify critical skill gaps with time-to-learn estimates', async () => {
      const skillGaps = await mlService.predictSkillGaps({
        currentRole: 'junior-engineer',
        targetRole: 'senior-engineer',
        currentSkills: [
          { name: 'javascript', level: 4, yearsExp: 2 },
          { name: 'react', level: 3, yearsExp: 1 },
          { name: 'databases', level: 2, yearsExp: 1 },
        ],
      });

      expect(skillGaps).toBeDefined();
      expect(skillGaps.gaps.length).toBeGreaterThan(0);

      skillGaps.gaps.forEach((gap) => {
        expect(gap.skill).toBeDefined();
        expect(gap.currentLevel).toBeGreaterThanOrEqual(1);
        expect(gap.targetLevel).toBeGreaterThan(gap.currentLevel);
        expect(gap.estimatedHours).toBeGreaterThan(0);
        expect(gap.difficulty).toMatch(/easy|medium|hard/);
      });

      // Verify total time estimate
      const totalHours = skillGaps.gaps.reduce((sum, gap) => sum + gap.estimatedHours, 0);
      expect(skillGaps.estimatedTotalHours).toBe(totalHours);
      expect(skillGaps.estimatedMonths).toBeGreaterThan(0);
    });

    it('should recommend learning path based on skill gaps', async () => {
      const learningPath = await mlService.recommendLearningPath({
        currentSkills: [{ name: 'javascript', level: 3 }],
        targetRole: 'senior-engineer',
        timeAvailableHoursPerWeek: 10,
        preferredLearningStyle: 'hands-on',
      });

      expect(learningPath).toBeDefined();
      expect(learningPath.steps.length).toBeGreaterThan(0);

      learningPath.steps.forEach((step, index) => {
        expect(step.skill).toBeDefined();
        expect(step.sequenceOrder).toBe(index + 1);
        expect(step.estimatedWeeks).toBeGreaterThan(0);
        expect(step.resources).toBeInstanceOf(Array);
        expect(step.resources.length).toBeGreaterThan(0);
      });

      // Verify time estimate is realistic
      const totalWeeks = learningPath.steps.reduce((sum, step) => sum + step.estimatedWeeks, 0);
      expect(learningPath.totalEstimatedWeeks).toBe(totalWeeks);
    });

    it('should track actual skill development against predictions', async () => {
      const userId = 'skill-user-123';

      // Initial prediction
      const prediction = await mlService.predictSkillGaps({
        currentRole: 'junior-engineer',
        targetRole: 'mid-engineer',
        currentSkills: [{ name: 'javascript', level: 2, yearsExp: 1 }],
      });

      const javascriptGap = prediction.gaps.find((g) => g.skill === 'javascript');
      const predictedHours = javascriptGap.estimatedHours;

      // Record actual learning
      await db.query(
        'INSERT INTO skill_development_records (user_id, skill, hours_learned, current_level) VALUES (?, ?, ?, ?)',
        [userId, 'javascript', 100, 3]
      );

      // Verify prediction accuracy
      const accuracy = 100 / predictedHours;
      expect(accuracy).toBeGreaterThan(0.5); // At least 50% accurate
    });
  });

  describe('Job Fit Scoring', () => {
    it('should calculate job fit score with component breakdown', async () => {
      const jobFit = await mlService.calculateJobFit({
        candidateProfile: {
          skills: [
            { name: 'typescript', level: 4 },
            { name: 'nodejs', level: 4 },
            { name: 'mongodb', level: 3 },
          ],
          yearsOfExperience: 5,
          location: 'San Francisco',
          salaryExpectation: 130000,
        },
        jobProfile: {
          title: 'Senior Backend Engineer',
          requiredSkills: [
            { name: 'typescript', requiredLevel: 4 },
            { name: 'nodejs', requiredLevel: 4 },
            { name: 'mongodb', requiredLevel: 3 },
          ],
          requiredYearsExperience: 5,
          location: 'San Francisco',
          offeredSalary: 140000,
        },
      });

      expect(jobFit).toBeDefined();
      expect(jobFit.overallScore).toBeGreaterThanOrEqual(0);
      expect(jobFit.overallScore).toBeLessThanOrEqual(100);

      // Check component scores
      expect(jobFit.components).toBeDefined();
      expect(jobFit.components.skillMatch).toBeGreaterThanOrEqual(0);
      expect(jobFit.components.experienceMatch).toBeGreaterThanOrEqual(0);
      expect(jobFit.components.locationMatch).toBeGreaterThanOrEqual(0);
      expect(jobFit.components.salaryMatch).toBeGreaterThanOrEqual(0);

      // Verify weighting
      const calculated =
        jobFit.components.skillMatch * 0.4 +
        jobFit.components.experienceMatch * 0.25 +
        jobFit.components.locationMatch * 0.15 +
        jobFit.components.salaryMatch * 0.2;

      expect(Math.abs(calculated - jobFit.overallScore)).toBeLessThan(1);
    });

    it('should identify skill mismatches for job fit', async () => {
      const jobFit = await mlService.calculateJobFit({
        candidateProfile: {
          skills: [
            { name: 'javascript', level: 3 },
            { name: 'react', level: 3 },
          ],
          yearsOfExperience: 3,
          location: 'New York',
          salaryExpectation: 100000,
        },
        jobProfile: {
          title: 'Senior Backend Engineer',
          requiredSkills: [
            { name: 'golang', requiredLevel: 4 },
            { name: 'kubernetes', requiredLevel: 3 },
            { name: 'postgresql', requiredLevel: 4 },
          ],
          requiredYearsExperience: 7,
          location: 'San Francisco',
          offeredSalary: 160000,
        },
      });

      expect(jobFit.missingSkills).toBeDefined();
      expect(jobFit.missingSkills.length).toBeGreaterThan(0);

      jobFit.missingSkills.forEach((skill) => {
        expect(skill.name).toBeDefined();
        expect(skill.requiredLevel).toBeGreaterThan(0);
        expect(skill.recommendedLearningPath).toBeDefined();
      });

      // Overall score should be lower due to skill gaps
      expect(jobFit.overallScore).toBeLessThan(60);
    });

    it('should predict job success probability', async () => {
      const successProb = await mlService.predictJobSuccessProbability({
        candidateProfile: {
          skills: [
            { name: 'typescript', level: 4 },
            { name: 'nodejs', level: 4 },
          ],
          yearsOfExperience: 6,
          educationLevel: 'bachelors',
          previousJobHistory: [
            { role: 'junior-engineer', yearsInRole: 1, performance: 'excellent' },
            { role: 'mid-engineer', yearsInRole: 3, performance: 'excellent' },
            { role: 'senior-engineer', yearsInRole: 2, performance: 'good' },
          ],
        },
        jobProfile: {
          title: 'Senior Backend Engineer',
          requiredSkills: [
            { name: 'typescript', requiredLevel: 4 },
            { name: 'nodejs', requiredLevel: 4 },
          ],
          requiredYearsExperience: 5,
          salarySalaryRange: [130000, 160000],
        },
      });

      expect(successProb).toBeDefined();
      expect(successProb.probability).toBeGreaterThanOrEqual(0);
      expect(successProb.probability).toBeLessThanOrEqual(1);
      expect(successProb.confidence).toBeGreaterThanOrEqual(0.7); // Good confidence

      // Success factors
      expect(successProb.successFactors).toBeInstanceOf(Array);
      expect(successProb.riskFactors).toBeInstanceOf(Array);
    });
  });

  describe('Career Path Recommendations', () => {
    it('should recommend next career steps', async () => {
      const recommendation = await mlService.recommendNextSteps({
        currentRole: 'mid-engineer',
        yearsInRole: 3,
        skills: [
          { name: 'typescript', level: 4 },
          { name: 'nodejs', level: 3 },
          { name: 'leadership', level: 2 },
        ],
        careerGoal: 'become-senior-engineer',
      });

      expect(recommendation).toBeDefined();
      expect(recommendation.nextSteps).toBeInstanceOf(Array);
      expect(recommendation.nextSteps.length).toBeGreaterThan(0);

      recommendation.nextSteps.forEach((step) => {
        expect(step.action).toBeDefined();
        expect(step.timelineMonths).toBeGreaterThan(0);
        expect(step.skillsToAcquire).toBeInstanceOf(Array);
        expect(step.expectedOutcome).toBeDefined();
      });
    });

    it('should identify alternative career paths', async () => {
      const alternatives = await mlService.recommendAlternativeCareerPaths({
        currentRole: 'software-engineer',
        skills: [
          { name: 'javascript', level: 4 },
          { name: 'systems-design', level: 3 },
          { name: 'communication', level: 3 },
        ],
        preferences: {
          preferRemote: true,
          minSalary: 100000,
          workLifeBalance: 'high',
        },
      });

      expect(alternatives).toBeDefined();
      expect(alternatives.length).toBeGreaterThan(0);

      alternatives.forEach((path) => {
        expect(path.role).toBeDefined();
        expect(path.matchScore).toBeGreaterThanOrEqual(0);
        expect(path.matchScore).toBeLessThanOrEqual(100);
        expect(path.skillTransferability).toBeGreaterThanOrEqual(0);
        expect(path.estimatedTimeToTransition).toBeGreaterThan(0);
      });
    });
  });

  describe('Model Performance & Monitoring', () => {
    it('should track model prediction accuracy metrics', async () => {
      const metrics = await mlService.getModelMetrics('salary_prediction');

      expect(metrics).toBeDefined();
      expect(metrics.meanAbsoluteError).toBeGreaterThanOrEqual(0);
      expect(metrics.rootMeanSquaredError).toBeGreaterThanOrEqual(0);
      expect(metrics.rSquared).toBeLessThanOrEqual(1);
      expect(metrics.totalPredictions).toBeGreaterThan(0);
    });

    it('should detect model drift and trigger retraining', async () => {
      const drift = await mlService.detectModelDrift('salary_prediction');

      expect(drift).toBeDefined();
      expect(drift.hasDrift).toBeInstanceOf(Boolean);
      expect(drift.driftScore).toBeGreaterThanOrEqual(0);
      expect(drift.driftScore).toBeLessThanOrEqual(1);

      if (drift.hasDrift) {
        expect(drift.affectedFeatures).toBeInstanceOf(Array);
        expect(drift.recommendRetrain).toBe(true);
      }
    });

    it('should schedule model retraining when drift detected', async () => {
      const retrainJob = await mlService.scheduleRetraining('salary_prediction', {
        trainingData: 'production',
        validationSplit: 0.2,
        maxTrainingTime: 3600, // 1 hour
      });

      expect(retrainJob).toBeDefined();
      expect(retrainJob.jobId).toBeDefined();
      expect(retrainJob.status).toBe('scheduled');
      expect(retrainJob.estimatedStartTime).toBeDefined();
    });
  });

  describe('Prediction Consistency Across Retests', () => {
    it('should produce consistent predictions for same input', async () => {
      const input = {
        role: 'engineer',
        yearsOfExperience: 5,
        skills: ['typescript', 'nodejs'],
        location: 'San Francisco',
      };

      const predictions = await Promise.all([
        mlService.predictSalary(input),
        mlService.predictSalary(input),
        mlService.predictSalary(input),
      ]);

      // All predictions should be identical
      expect(predictions[0].salary).toBe(predictions[1].salary);
      expect(predictions[1].salary).toBe(predictions[2].salary);
    });

    it('should produce reasonable predictions for interpolated inputs', async () => {
      // Test salary interpolation between known roles
      const junior = await mlService.predictSalary({
        role: 'junior-engineer',
        yearsOfExperience: 1,
        skills: ['javascript'],
        location: 'San Francisco',
      });

      const mid = await mlService.predictSalary({
        role: 'mid-engineer',
        yearsOfExperience: 4,
        skills: ['typescript', 'nodejs'],
        location: 'San Francisco',
      });

      const senior = await mlService.predictSalary({
        role: 'senior-engineer',
        yearsOfExperience: 8,
        skills: ['system-design', 'architecture'],
        location: 'San Francisco',
      });

      // Verify progression
      expect(junior.salary).toBeLessThan(mid.salary);
      expect(mid.salary).toBeLessThan(senior.salary);

      // Verify spacing is reasonable (each step ~40-50% increase)
      const juniorToMid = (mid.salary - junior.salary) / junior.salary;
      const midToSenior = (senior.salary - mid.salary) / mid.salary;

      expect(juniorToMid).toBeGreaterThan(0.3);
      expect(juniorToMid).toBeLessThan(0.7);
      expect(midToSenior).toBeGreaterThan(0.3);
      expect(midToSenior).toBeLessThan(0.7);
    });
  });
});
