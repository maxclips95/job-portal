import { injectable, inject } from 'tsyringe';
import db from '../config/database';
import { redis } from '../config/redis';
import {
  MentorProfile,
  MenteeProfile,
  MentorshipMatch,
  MentorshipRelationship,
  CompatibilityScore,
  MentorshipGoal,
} from '../types/mentorship.types';
import { MentorshipValidator } from '../utils/validators/mentorship.validator';

@injectable()
export class MentorshipService {
  constructor(
    @inject(MentorshipValidator) private validator: MentorshipValidator,
  ) {}

  /**
   * Get mentor profile
   */
  async getMentorProfile(mentorId: string): Promise<MentorProfile | null> {
    // Try cache
    const cached = await redis.get(`mentor:${mentorId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const mentor = await db('mentors')
      .where('userId', mentorId)
      .first();

    if (!mentor) return null;

    const profile = await this.formatMentorProfile(mentor);

    // Cache for 1 hour
    await redis.setex(`mentor:${mentorId}`, 3600, JSON.stringify(profile));

    return profile;
  }

  /**
   * Create or update mentor profile
   */
  async createMentorProfile(
    userId: string,
    data: {
      expertise: string[];
      yearsOfExperience: number;
      bio: string;
      availability: {
        hoursPerWeek: number;
        timezone: string;
      };
      hourlyRate?: number;
      acceptingMentees: boolean;
    },
  ): Promise<MentorProfile> {
    const validated = this.validator.validateMentorProfile(data);

    const existing = await db('mentors').where('userId', userId).first();

    if (existing) {
      // Update existing
      await db('mentors')
        .where('userId', userId)
        .update({
          ...validated,
          availability: JSON.stringify(data.availability),
          updatedAt: new Date(),
        });
    } else {
      // Create new
      await db('mentors').insert({
        userId,
        ...validated,
        availability: JSON.stringify(data.availability),
        rating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Invalidate cache
    await redis.del(`mentor:${userId}`);

    return this.getMentorProfile(userId) as Promise<MentorProfile>;
  }

  /**
   * Get mentee profile
   */
  async getMenteeProfile(menteeId: string): Promise<MenteeProfile | null> {
    const user = await db('users')
      .where('id', menteeId)
      .select('id', 'firstName', 'lastName', 'email', 'profilePicture', 'bio');

    if (!user) return null;

    // Get mentee's current role and goals
    const experience = await db('experience')
      .where('candidateId', menteeId)
      .orderBy('createdAt', 'desc')
      .first();

    const skills = await db('skills')
      .where('candidateId', menteeId)
      .select('skillName', 'proficiency');

    return {
      id: menteeId,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      email: user[0].email,
      profilePicture: user[0].profilePicture,
      bio: user[0].bio,
      currentRole: experience?.jobTitle || 'Seeking Role',
      skills: skills.map(s => ({ name: s.skillName, level: s.proficiency })),
      yearsOfExperience: this.calculateYearsOfExperience(experience),
    };
  }

  /**
   * Find mentor matches for a mentee
   */
  async findMentorMatches(
    menteeId: string,
    options?: {
      expertise?: string[];
      maxResults?: number;
      minCompatibility?: number;
    },
  ): Promise<MentorshipMatch[]> {
    const mentee = await this.getMenteeProfile(menteeId);
    if (!mentee) {
      throw new Error('Mentee profile not found');
    }

    // Get all available mentors
    const mentors = await db('mentors')
      .where('acceptingMentees', true)
      .select('*');

    const matches: MentorshipMatch[] = [];

    for (const mentor of mentors) {
      // Skip if mentee is the mentor
      if (mentor.userId === menteeId) continue;

      // Calculate compatibility score
      const compatibility = await this.calculateCompatibility(
        mentor,
        mentee,
        options?.expertise,
      );

      if (compatibility.score >= (options?.minCompatibility || 50)) {
        matches.push({
          mentorId: mentor.userId,
          mentorName: mentor.firstName,
          expertise: JSON.parse(mentor.expertise || '[]'),
          yearsOfExperience: mentor.yearsOfExperience,
          rating: mentor.rating,
          reviewCount: mentor.reviewCount,
          availability: JSON.parse(mentor.availability || '{}'),
          hourlyRate: mentor.hourlyRate,
          bio: mentor.bio,
          compatibilityScore: compatibility.score,
          compatibilityDetails: compatibility,
        });
      }
    }

    // Sort by compatibility score
    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Return top results
    return matches.slice(0, options?.maxResults || 10);
  }

  /**
   * Calculate compatibility between mentor and mentee
   */
  private async calculateCompatibility(
    mentor: any,
    mentee: MenteeProfile,
    preferredExpertise?: string[],
  ): Promise<CompatibilityScore> {
    const mentorExpertise = JSON.parse(mentor.expertise || '[]');

    // Skill gap match (30%)
    let skillMatch = 0;
    if (preferredExpertise && preferredExpertise.length > 0) {
      const matchingSkills = preferredExpertise.filter(skill =>
        mentorExpertise.some((e: string) => e.toLowerCase().includes(skill.toLowerCase())),
      );
      skillMatch = (matchingSkills.length / preferredExpertise.length) * 100;
    } else {
      // Match mentee's current skills with mentor expertise
      const matchingSkills = mentee.skills.filter(skill =>
        mentorExpertise.some((e: string) => e.toLowerCase().includes(skill.name.toLowerCase())),
      );
      skillMatch = (matchingSkills.length / Math.max(mentee.skills.length, 1)) * 100;
    }

    // Experience level match (25%)
    const experienceDiff = Math.abs(mentor.yearsOfExperience - mentee.yearsOfExperience);
    const experienceMatch = Math.max(0, 100 - experienceDiff * 10);

    // Goal alignment (25%) - simplified
    const goalMatch = 75; // Placeholder - would need mentee goals data

    // Availability match (20%) - simplified
    const availabilityMatch = 80; // Placeholder - would check timezone/hours

    // Weighted score
    const totalScore =
      skillMatch * 0.3 +
      experienceMatch * 0.25 +
      goalMatch * 0.25 +
      availabilityMatch * 0.2;

    return {
      score: Math.round(totalScore),
      skillMatch: Math.round(skillMatch),
      experienceMatch: Math.round(experienceMatch),
      goalMatch: Math.round(goalMatch),
      availabilityMatch: Math.round(availabilityMatch),
    };
  }

  /**
   * Create mentorship relationship
   */
  async createRelationship(
    mentorId: string,
    menteeId: string,
    goals: MentorshipGoal[],
  ): Promise<MentorshipRelationship> {
    const validated = this.validator.validateRelationship({ mentorId, menteeId, goals });

    // Calculate compatibility score for history
    const mentor = await db('mentors').where('userId', mentorId).first();
    const mentee = await this.getMenteeProfile(menteeId);

    if (!mentor || !mentee) {
      throw new Error('Mentor or mentee not found');
    }

    const compatibility = await this.calculateCompatibility(mentor, mentee);

    const result = await db('mentorship_relationships').insert(
      {
        mentorId,
        menteeId,
        matchScore: compatibility.score,
        status: 'active',
        goals: JSON.stringify(goals),
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['id'],
    );

    const relationshipId = result[0].id || result[0];

    // Cache the relationship
    await redis.setex(
      `mentorship:${relationshipId}`,
      3600,
      JSON.stringify({
        id: relationshipId,
        mentorId,
        menteeId,
        goals,
        matchScore: compatibility.score,
        status: 'active',
        startDate: new Date(),
      }),
    );

    return {
      id: relationshipId,
      mentorId,
      menteeId,
      goals,
      matchScore: compatibility.score,
      status: 'active',
      startDate: new Date(),
      createdAt: new Date(),
    };
  }

  /**
   * Get mentorship relationship
   */
  async getRelationship(
    relationshipId: string,
    userId: string,
  ): Promise<MentorshipRelationship | null> {
    // Try cache
    const cached = await redis.get(`mentorship:${relationshipId}`);
    if (cached) {
      const rel = JSON.parse(cached);
      // Verify access
      if (rel.mentorId !== userId && rel.menteeId !== userId) {
        return null;
      }
      return rel;
    }

    const relationship = await db('mentorship_relationships')
      .where('id', relationshipId)
      .first();

    if (!relationship) return null;

    // Verify access
    if (relationship.mentorId !== userId && relationship.menteeId !== userId) {
      return null;
    }

    const formatted = this.formatRelationship(relationship);

    // Cache for 1 hour
    await redis.setex(`mentorship:${relationshipId}`, 3600, JSON.stringify(formatted));

    return formatted;
  }

  /**
   * Get user's mentorship relationships
   */
  async getUserRelationships(
    userId: string,
    role: 'mentor' | 'mentee' | 'both' = 'both',
  ): Promise<MentorshipRelationship[]> {
    let query = db('mentorship_relationships');

    if (role === 'mentor') {
      query = query.where('mentorId', userId);
    } else if (role === 'mentee') {
      query = query.where('menteeId', userId);
    } else {
      query = query.whereIn(
        'id',
        db.raw('id'),
      );
      // Use OR condition
      query = query.where('mentorId', userId).orWhere('menteeId', userId);
    }

    const relationships = await query.orderBy('createdAt', 'desc');

    return relationships.map(r => this.formatRelationship(r));
  }

  /**
   * Update mentorship goals
   */
  async updateGoals(
    relationshipId: string,
    userId: string,
    goals: MentorshipGoal[],
  ): Promise<MentorshipRelationship> {
    const relationship = await db('mentorship_relationships')
      .where('id', relationshipId)
      .first();

    if (!relationship || (relationship.mentorId !== userId && relationship.menteeId !== userId)) {
      throw new Error('Relationship not found or unauthorized');
    }

    await db('mentorship_relationships').where('id', relationshipId).update({
      goals: JSON.stringify(goals),
      updatedAt: new Date(),
    });

    // Invalidate cache
    await redis.del(`mentorship:${relationshipId}`);

    return this.getRelationship(relationshipId, userId) as Promise<MentorshipRelationship>;
  }

  /**
   * Send mentorship message
   */
  async sendMessage(
    relationshipId: string,
    senderId: string,
    message: string,
    attachments?: string[],
  ): Promise<any> {
    const relationship = await db('mentorship_relationships')
      .where('id', relationshipId)
      .first();

    if (!relationship) {
      throw new Error('Relationship not found');
    }

    // Verify sender is part of relationship
    if (relationship.mentorId !== senderId && relationship.menteeId !== senderId) {
      throw new Error('Unauthorized');
    }

    const result = await db('mentorship_messages').insert(
      {
        relationshipId,
        senderId,
        message,
        attachments: attachments ? JSON.stringify(attachments) : null,
        createdAt: new Date(),
      },
      ['id'],
    );

    return {
      id: result[0].id || result[0],
      relationshipId,
      senderId,
      message,
      attachments,
      createdAt: new Date(),
    };
  }

  /**
   * Get mentorship messages
   */
  async getMessages(
    relationshipId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    // Verify access
    const relationship = await db('mentorship_relationships')
      .where('id', relationshipId)
      .first();

    if (!relationship || (relationship.mentorId !== userId && relationship.menteeId !== userId)) {
      throw new Error('Relationship not found or unauthorized');
    }

    const messages = await db('mentorship_messages')
      .where('relationshipId', relationshipId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    return messages
      .reverse()
      .map(m => ({
        id: m.id,
        senderId: m.senderId,
        message: m.message,
        attachments: m.attachments ? JSON.parse(m.attachments) : [],
        createdAt: m.createdAt,
      }));
  }

  /**
   * Submit mentorship review
   */
  async submitReview(
    relationshipId: string,
    userId: string,
    rating: number,
    feedback: string,
  ): Promise<boolean> {
    const relationship = await db('mentorship_relationships')
      .where('id', relationshipId)
      .first();

    if (!relationship) {
      throw new Error('Relationship not found');
    }

    // Only mentee can review mentor
    if (relationship.menteeId !== userId) {
      throw new Error('Only mentee can submit review');
    }

    // Update relationship status
    await db('mentorship_relationships').where('id', relationshipId).update({
      status: 'completed',
      endDate: new Date(),
      updatedAt: new Date(),
    });

    // Update mentor rating
    const mentor = await db('mentors').where('userId', relationship.mentorId).first();
    const newRating = (mentor.rating * mentor.reviewCount + rating) / (mentor.reviewCount + 1);

    await db('mentors')
      .where('userId', relationship.mentorId)
      .update({
        rating: newRating,
        reviewCount: mentor.reviewCount + 1,
        updatedAt: new Date(),
      });

    // Store review
    await db('mentorship_reviews').insert({
      relationshipId,
      reviewerId: userId,
      rating,
      feedback,
      createdAt: new Date(),
    });

    // Invalidate caches
    await redis.del(`mentor:${relationship.mentorId}`);
    await redis.del(`mentorship:${relationshipId}`);

    return true;
  }

  /**
   * Pause mentorship
   */
  async pauseRelationship(
    relationshipId: string,
    userId: string,
  ): Promise<MentorshipRelationship> {
    const relationship = await db('mentorship_relationships')
      .where('id', relationshipId)
      .first();

    if (!relationship || (relationship.mentorId !== userId && relationship.menteeId !== userId)) {
      throw new Error('Relationship not found or unauthorized');
    }

    await db('mentorship_relationships').where('id', relationshipId).update({
      status: 'paused',
      updatedAt: new Date(),
    });

    await redis.del(`mentorship:${relationshipId}`);

    return this.getRelationship(relationshipId, userId) as Promise<MentorshipRelationship>;
  }

  /**
   * Helper: Format mentor profile
   */
  private async formatMentorProfile(mentor: any): Promise<MentorProfile> {
    return {
      userId: mentor.userId,
      expertise: JSON.parse(mentor.expertise || '[]'),
      yearsOfExperience: mentor.yearsOfExperience,
      bio: mentor.bio,
      availability: JSON.parse(mentor.availability || '{}'),
      hourlyRate: mentor.hourlyRate,
      rating: mentor.rating,
      reviewCount: mentor.reviewCount,
      acceptingMentees: mentor.acceptingMentees,
    };
  }

  /**
   * Helper: Format relationship
   */
  private formatRelationship(relationship: any): MentorshipRelationship {
    return {
      id: relationship.id,
      mentorId: relationship.mentorId,
      menteeId: relationship.menteeId,
      goals: JSON.parse(relationship.goals || '[]'),
      matchScore: relationship.matchScore,
      status: relationship.status,
      startDate: relationship.startDate,
      endDate: relationship.endDate,
      createdAt: relationship.createdAt,
    };
  }

  /**
   * Helper: Calculate years of experience
   */
  private calculateYearsOfExperience(experience: any): number {
    if (!experience) return 0;

    const startYear = experience.startYear;
    const endYear = experience.isCurrent ? new Date().getFullYear() : experience.endYear;

    return endYear - startYear;
  }
}
