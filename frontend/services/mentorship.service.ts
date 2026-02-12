import axios from 'axios';
import {
  MentorProfile,
  MenteeProfile,
  MentorshipMatch,
  MentorshipRelationship,
  MentorshipMessage,
  FindMentorMatchesRequest,
  MentorshipMatchResponse,
  MentorshipRelationshipResponse,
  NotificationResponse,
} from '@/types/career-mentorship.types';

const API_BASE = '/api/mentorship';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const mentorshipService = {
  // Mentor Management
  async getMentorProfile(mentorId: string): Promise<MentorProfile> {
    const response = await api.get<{ data: MentorProfile }>(
      `/mentors/${mentorId}`,
    );
    return response.data.data;
  },

  async createMentorProfile(data: {
    expertise: string[];
    yearsOfExperience: number;
    bio: string;
    availability: { hoursPerWeek: number; timezone: string };
    hourlyRate?: number;
    acceptingMentees: boolean;
  }): Promise<MentorProfile> {
    const response = await api.post<{ data: MentorProfile }>(
      '/mentors/profile',
      data,
    );
    return response.data.data;
  },

  async getMenteeProfile(menteeId: string): Promise<MenteeProfile> {
    const response = await api.get<{ data: MenteeProfile }>(
      `/mentees/${menteeId}`,
    );
    return response.data.data;
  },

  // Matching
  async findMentorMatches(
    options?: FindMentorMatchesRequest,
  ): Promise<MentorshipMatch[]> {
    const response = await api.get<MentorshipMatchResponse>(
      '/mentors/match',
      { params: options },
    );
    return response.data.data;
  },

  async checkCompatibility(
    mentorId: string,
    menteeId: string,
  ): Promise<{ score: number }> {
    const response = await api.post<{ data: { score: number } }>(
      '/mentorship/compatibility',
      { mentorId, menteeId },
    );
    return response.data.data;
  },

  // Relationships
  async createRelationship(
    mentorId: string,
    goals: Array<{
      title: string;
      description: string;
      targetDate: Date;
    }>,
  ): Promise<MentorshipRelationship> {
    const response = await api.post<MentorshipRelationshipResponse>(
      '/relationships',
      { mentorId, goals },
    );
    return response.data.data;
  },

  async getRelationship(relationshipId: string): Promise<MentorshipRelationship> {
    const response = await api.get<MentorshipRelationshipResponse>(
      `/relationships/${relationshipId}`,
    );
    return response.data.data;
  },

  async getUserRelationships(
    role?: 'mentor' | 'mentee' | 'both',
  ): Promise<MentorshipRelationship[]> {
    const response = await api.get<{ data: MentorshipRelationship[] }>(
      '/relationships',
      { params: { role } },
    );
    return response.data.data;
  },

  async updateGoals(
    relationshipId: string,
    goals: Array<{
      id?: string;
      title: string;
      description: string;
      targetDate: Date;
      completed: boolean;
    }>,
  ): Promise<MentorshipRelationship> {
    const response = await api.put<MentorshipRelationshipResponse>(
      `/relationships/${relationshipId}/goals`,
      { goals },
    );
    return response.data.data;
  },

  async pauseRelationship(relationshipId: string): Promise<MentorshipRelationship> {
    const response = await api.post<MentorshipRelationshipResponse>(
      `/relationships/${relationshipId}/pause`,
    );
    return response.data.data;
  },

  async submitReview(
    relationshipId: string,
    rating: number,
    feedback: string,
  ): Promise<boolean> {
    const response = await api.post<NotificationResponse>(
      `/relationships/${relationshipId}/review`,
      { rating, feedback },
    );
    return response.data.success;
  },

  // Messaging
  async sendMessage(
    relationshipId: string,
    message: string,
    attachments?: string[],
  ): Promise<MentorshipMessage> {
    const response = await api.post<{ data: MentorshipMessage }>(
      `/messages`,
      { relationshipId, message, attachments },
    );
    return response.data.data;
  },

  async getMessages(
    relationshipId: string,
    limit?: number,
    offset?: number,
  ): Promise<MentorshipMessage[]> {
    const response = await api.get<{ data: MentorshipMessage[] }>(
      `/messages/${relationshipId}`,
      { params: { limit, offset } },
    );
    return response.data.data;
  },
};
