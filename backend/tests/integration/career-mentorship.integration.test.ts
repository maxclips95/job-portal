/**
 * Integration Tests: Career Pathway & Mentorship Flows
 * Tests the complete lifecycle of career and mentorship features
 * Including database transactions, caching, and service interactions
 */

import { describe, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createConnection } from 'typeorm';
import redis from 'redis';
import { app } from '../../index';
import { CareerPathwayService } from '../../services/career-pathway.service';
import { MentorshipService } from '../../services/mentorship.service';
import { Database } from '../../config/database';
import { RedisCache } from '../../config/redis';

describe('Career Pathway & Mentorship Integration Tests', () => {
  let db: Database;
  let cache: RedisCache;
  let careerService: CareerPathwayService;
  let mentorshipService: MentorshipService;
  let testUserId: string;
  let testMentorId: string;
  let testPathwayId: string;

  beforeAll(async () => {
    // Initialize database connection
    db = new Database();
    await db.connect();

    // Initialize Redis cache
    cache = new RedisCache();
    await cache.connect();

    // Initialize services
    careerService = new CareerPathwayService(db, cache);
    mentorshipService = new MentorshipService(db, cache);

    // Create test users
    testUserId = await createTestUser('candidate@example.com', 'candidate');
    testMentorId = await createTestUser('mentor@example.com', 'mentor');
  });

  afterAll(async () => {
    await db.disconnect();
    await cache.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cache.flushAll();
  });

  describe('Career Pathway Creation & Progression', () => {
    it('should create a career pathway with salary progression', async () => {
      const pathwayData = {
        userId: testUserId,
        name: 'Senior Engineer Career Path',
        description: 'Progress from Junior to Senior Engineer',
        startRole: 'junior-engineer',
        targetRole: 'senior-engineer',
        timelineYears: 5,
      };

      const pathway = await careerService.createPathway(testUserId, pathwayData);

      expect(pathway).toBeDefined();
      expect(pathway.id).toBeDefined();
      expect(pathway.startRole).toBe('junior-engineer');
      expect(pathway.targetRole).toBe('senior-engineer');
      expect(pathway.salaryProgression).toHaveLength(5);
      expect(pathway.salaryProgression[0].year).toBe(0);
      expect(pathway.salaryProgression[4].year).toBe(5);
      expect(pathway.salaryProgression[4].salary).toBeGreaterThan(pathway.salaryProgression[0].salary);

      testPathwayId = pathway.id;
    });

    it('should calculate accurate salary progression', async () => {
      const progression = await careerService.calculateSalaryProgression(
        'junior-engineer', // $60k
        'senior-engineer', // $120k
        5
      );

      expect(progression).toHaveLength(5);
      expect(progression[0].salary).toBe(60000);
      expect(progression[4].salary).toBe(120000);

      // Verify linear progression
      const differences: number[] = [];
      for (let i = 0; i < progression.length - 1; i++) {
        differences.push(progression[i + 1].salary - progression[i].salary);
      }

      // All differences should be approximately equal (±1% tolerance for rounding)
      const avgDiff = differences[0];
      differences.forEach((diff) => {
        expect(Math.abs(diff - avgDiff)).toBeLessThan(avgDiff * 0.01);
      });
    });

    it('should map required skills for career progression', async () => {
      const skillMapping = await careerService.getSkillsMappingForRoles(
        'junior-engineer',
        'senior-engineer'
      );

      expect(skillMapping).toBeDefined();
      expect(skillMapping.length).toBeGreaterThan(0);

      skillMapping.forEach((skill) => {
        expect(skill.name).toBeDefined();
        expect(skill.currentLevel).toBeDefined();
        expect(skill.targetLevel).toBeDefined();
        expect(skill.timeToLearnHours).toBeGreaterThan(0);
        expect(skill.targetLevel).toBeGreaterThanOrEqual(skill.currentLevel);
      });
    });

    it('should create milestone and track progress', async () => {
      const milestone = await careerService.createMilestone(testPathwayId, {
        title: 'Master Microservices Architecture',
        description: 'Learn and implement microservices patterns',
        skillsRequired: ['distributed-systems', 'message-queues'],
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });

      expect(milestone).toBeDefined();
      expect(milestone.status).toBe('pending');
      expect(milestone.progressPercentage).toBe(0);

      // Update progress
      const updated = await careerService.updateMilestoneProgress(milestone.id, {
        progressPercentage: 50,
      });

      expect(updated.progressPercentage).toBe(50);
      expect(updated.status).toBe('in_progress');

      // Complete milestone
      const completed = await careerService.updateMilestoneProgress(milestone.id, {
        progressPercentage: 100,
      });

      expect(completed.progressPercentage).toBe(100);
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });

    it('should cache pathway data for 1 hour', async () => {
      const pathway = await careerService.getPathwayById(testPathwayId);

      // Fetch again immediately - should come from cache
      const start = Date.now();
      const cachedPathway = await careerService.getPathwayById(testPathwayId);
      const duration = Date.now() - start;

      expect(cachedPathway.id).toBe(pathway.id);
      expect(duration).toBeLessThan(10); // Cache hit should be <10ms

      // Verify cache TTL is 1 hour
      const ttl = await cache.getTTL(`pathway:${testPathwayId}`);
      expect(ttl).toBeLessThan(3600);
      expect(ttl).toBeGreaterThan(3595);
    });

    it('should invalidate cache on pathway update', async () => {
      // Get initial pathway
      const initial = await careerService.getPathwayById(testPathwayId);
      const initialName = initial.name;

      // Update pathway
      const updated = await careerService.updatePathway(testPathwayId, {
        name: 'Updated Career Path',
      });

      expect(updated.name).toBe('Updated Career Path');

      // Cache should be invalidated - fetch should hit database
      const fresh = await careerService.getPathwayById(testPathwayId);
      expect(fresh.name).toBe('Updated Career Path');

      // Verify cache key was deleted
      const cached = await cache.get(`pathway:${testPathwayId}`);
      expect(cached).toBeNull(); // Should be null after invalidation
    });

    it('should predict career path using ML model', async () => {
      const prediction = await careerService.predictCareerPath(testUserId, {
        currentRole: 'junior-engineer',
        yearsExperience: 2,
        skills: ['javascript', 'typescript', 'react'],
        preferences: { remote: true, salary: 100000 },
      });

      expect(prediction).toBeDefined();
      expect(prediction.recommendedPath).toBeDefined();
      expect(prediction.recommendedPath.length).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.estimatedTimeline).toBeGreaterThan(0);
    });
  });

  describe('Mentorship Lifecycle Management', () => {
    it('should create mentor profile with expertise', async () => {
      const mentorProfile = await mentorshipService.createMentorProfile(testMentorId, {
        expertise: [
          { skill: 'architecture', yearsExperience: 10, proficiency: 'expert' },
          { skill: 'leadership', yearsExperience: 5, proficiency: 'advanced' },
        ],
        yearsOfExperience: 12,
        bio: 'Senior architect with focus on scalable systems',
        availability: {
          hoursPerWeek: 5,
          timezone: 'UTC',
          preferredDays: ['monday', 'wednesday', 'friday'],
        },
        hourlyRate: 100,
      });

      expect(mentorProfile).toBeDefined();
      expect(mentorProfile.expertise).toHaveLength(2);
      expect(mentorProfile.rating).toBe(0); // No reviews yet
    });

    it('should find mentor matches with compatibility scoring', async () => {
      const matches = await mentorshipService.findMentorMatches(testUserId, {
        skills: ['architecture', 'typescript'],
        goalDescription: 'Become a system architect',
        availabilityHoursPerWeek: 3,
        maxResults: 10,
      });

      expect(matches).toBeDefined();
      expect(matches.length).toBeGreaterThan(0);

      matches.forEach((match) => {
        expect(match.mentorId).toBeDefined();
        expect(match.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(match.compatibilityScore).toBeLessThanOrEqual(100);
        expect(match.skillMatch).toBeDefined();
        expect(match.experienceMatch).toBeDefined();
        expect(match.goalAlignment).toBeDefined();
        expect(match.availabilityMatch).toBeDefined();
      });

      // Verify sorted by compatibility score (descending)
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].compatibilityScore).toBeGreaterThanOrEqual(matches[i + 1].compatibilityScore);
      }
    });

    it('should calculate 4-factor compatibility score', async () => {
      const compatibility = await mentorshipService.calculateCompatibility(
        testMentorId,
        testUserId
      );

      expect(compatibility).toBeDefined();
      expect(compatibility.overallScore).toBeGreaterThanOrEqual(0);
      expect(compatibility.overallScore).toBeLessThanOrEqual(100);
      expect(compatibility.skillMatch).toBeDefined();
      expect(compatibility.experienceMatch).toBeDefined();
      expect(compatibility.goalAlignment).toBeDefined();
      expect(compatibility.availabilityMatch).toBeDefined();

      // Verify weighting: skill 30%, experience 25%, goals 25%, availability 20%
      const calculated =
        compatibility.skillMatch * 0.3 +
        compatibility.experienceMatch * 0.25 +
        compatibility.goalAlignment * 0.25 +
        compatibility.availabilityMatch * 0.2;

      expect(Math.abs(calculated - compatibility.overallScore)).toBeLessThan(1);
    });

    it('should create mentorship relationship', async () => {
      const relationship = await mentorshipService.createRelationship(
        testMentorId,
        testUserId,
        {
          goals: [
            { title: 'Master system design', targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
            { title: 'Lead architecture decisions', targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
          ],
          expectedCommitmentHoursPerMonth: 10,
        }
      );

      expect(relationship).toBeDefined();
      expect(relationship.mentorId).toBe(testMentorId);
      expect(relationship.menteeId).toBe(testUserId);
      expect(relationship.status).toBe('active');
      expect(relationship.goals).toHaveLength(2);
      expect(relationship.matchScore).toBeGreaterThanOrEqual(0);
      expect(relationship.startDate).toBeDefined();
    });

    it('should handle mentorship messaging with chronological ordering', async () => {
      // Create relationship first
      const relationship = await mentorshipService.createRelationship(
        testMentorId,
        testUserId,
        { goals: [] }
      );

      // Send messages
      const msg1 = await mentorshipService.sendMessage(relationship.id, testUserId, {
        message: 'Hi, I want to learn about system design',
      });

      const msg2 = await mentorshipService.sendMessage(relationship.id, testMentorId, {
        message: 'Great! Lets start with design patterns',
      });

      const msg3 = await mentorshipService.sendMessage(relationship.id, testUserId, {
        message: 'Perfect, when can we start?',
      });

      // Fetch messages
      const messages = await mentorshipService.getMessages(relationship.id);

      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe(msg1.id);
      expect(messages[1].id).toBe(msg2.id);
      expect(messages[2].id).toBe(msg3.id);

      // Verify sender IDs
      expect(messages[0].senderId).toBe(testUserId);
      expect(messages[1].senderId).toBe(testMentorId);
      expect(messages[2].senderId).toBe(testUserId);

      // Verify timestamps are in order
      for (let i = 0; i < messages.length - 1; i++) {
        expect(messages[i].createdAt.getTime()).toBeLessThanOrEqual(messages[i + 1].createdAt.getTime());
      }
    });

    it('should only allow mentee to submit review', async () => {
      const relationship = await mentorshipService.createRelationship(
        testMentorId,
        testUserId,
        { goals: [] }
      );

      // Mentee can review mentor
      const review = await mentorshipService.submitReview(
        relationship.id,
        testUserId,
        {
          rating: 5,
          feedback: 'Excellent mentor, very helpful',
        }
      );

      expect(review).toBeDefined();
      expect(review.rating).toBe(5);

      // Verify mentor rating updated
      const mentor = await mentorshipService.getMentorProfile(testMentorId);
      expect(mentor.rating).toBeGreaterThan(0);

      // Mentor cannot review mentee
      const mentorReviewAttempt = mentorshipService.submitReview(
        relationship.id,
        testMentorId,
        {
          rating: 5,
          feedback: 'Good mentee',
        }
      );

      expect(mentorReviewAttempt).rejects.toThrow('Only mentee can submit review');
    });

    it('should pause and resume mentorship relationship', async () => {
      const relationship = await mentorshipService.createRelationship(
        testMentorId,
        testUserId,
        { goals: [] }
      );

      expect(relationship.status).toBe('active');

      // Pause relationship
      const paused = await mentorshipService.updateRelationshipStatus(
        relationship.id,
        'paused'
      );

      expect(paused.status).toBe('paused');

      // Resume relationship
      const resumed = await mentorshipService.updateRelationshipStatus(
        relationship.id,
        'active'
      );

      expect(resumed.status).toBe('active');
    });
  });

  describe('Database Transactions & Integrity', () => {
    it('should handle concurrent pathway creation with transaction safety', async () => {
      const concurrentCreations = Array(5)
        .fill(null)
        .map((_, i) =>
          careerService.createPathway(testUserId, {
            name: `Pathway ${i}`,
            startRole: 'junior-engineer',
            targetRole: 'senior-engineer',
            timelineYears: 5,
          })
        );

      const pathways = await Promise.all(concurrentCreations);

      expect(pathways).toHaveLength(5);

      // Verify all pathways were created with unique IDs
      const ids = new Set(pathways.map((p) => p.id));
      expect(ids.size).toBe(5);

      // Verify all belong to same user
      const userPathways = await careerService.getUserPathways(testUserId);
      expect(userPathways.length).toBeGreaterThanOrEqual(5);
    });

    it('should cascade delete milestones when pathway is deleted', async () => {
      const pathway = await careerService.createPathway(testUserId, {
        name: 'Test Pathway',
        startRole: 'junior-engineer',
        targetRole: 'senior-engineer',
        timelineYears: 5,
      });

      const milestone = await careerService.createMilestone(pathway.id, {
        title: 'Test Milestone',
        dueDate: new Date(),
      });

      const milestones = await careerService.getPathwayMilestones(pathway.id);
      expect(milestones).toHaveLength(1);

      // Delete pathway
      await careerService.deletePathway(pathway.id);

      // Verify milestone was also deleted
      const milestonesAfter = await careerService.getPathwayMilestones(pathway.id);
      expect(milestonesAfter).toHaveLength(0);

      const milestoneCheck = await careerService.getMilestoneById(milestone.id);
      expect(milestoneCheck).toBeNull();
    });

    it('should prevent deletion of active mentorship relationships', async () => {
      const relationship = await mentorshipService.createRelationship(
        testMentorId,
        testUserId,
        { goals: [] }
      );

      // Cannot delete active relationship
      const deleteAttempt = mentorshipService.deleteRelationship(relationship.id);
      expect(deleteAttempt).rejects.toThrow('Cannot delete active relationship');

      // Can delete after ending
      await mentorshipService.updateRelationshipStatus(relationship.id, 'completed');
      const deletion = await mentorshipService.deleteRelationship(relationship.id);
      expect(deletion).toBeUndefined();
    });
  });

  describe('Redis Caching Behavior', () => {
    it('should cache mentor profiles with 1 hour TTL', async () => {
      const mentorProfile = await mentorshipService.getMentorProfile(testMentorId);
      const initial = mentorProfile.rating;

      // Fetch from cache
      const cached = await mentorshipService.getMentorProfile(testMentorId);
      expect(cached.rating).toBe(initial);

      // Verify TTL
      const ttl = await cache.getTTL(`mentor:${testMentorId}`);
      expect(ttl).toBeLessThan(3600);
      expect(ttl).toBeGreaterThan(3595);
    });

    it('should invalidate mentor cache on review submission', async () => {
      const relationship = await mentorshipService.createRelationship(
        testMentorId,
        testUserId,
        { goals: [] }
      );

      const mentor1 = await mentorshipService.getMentorProfile(testMentorId);
      const rating1 = mentor1.rating;

      await mentorshipService.submitReview(relationship.id, testUserId, {
        rating: 5,
        feedback: 'Great!',
      });

      // Cache should be invalidated
      const mentor2 = await mentorshipService.getMentorProfile(testMentorId);
      expect(mentor2.rating).toBeGreaterThan(rating1);
    });
  });

  // Helper functions
  async function createTestUser(email: string, role: string): Promise<string> {
    const user = await db.query(
      `INSERT INTO users (email, role, created_at) VALUES (?, ?, NOW()) RETURNING id`,
      [email, role]
    );
    return user[0].id;
  }
});
