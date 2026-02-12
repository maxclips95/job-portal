import axios from 'axios';
import {
  CareerPathway,
  Milestone,
  PathwayTemplate,
  CreatePathwayRequest,
  UpdatePathwayRequest,
  CareerPathwayResponse,
  MilestoneResponse,
} from '@/types/career-mentorship.types';

const API_BASE = '/api/career';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const careerService = {
  // Career Pathways
  async createPathway(data: CreatePathwayRequest): Promise<CareerPathway> {
    const response = await api.post<CareerPathwayResponse>('/pathways', data);
    return response.data.data;
  },

  async getPathwayById(pathwayId: string): Promise<CareerPathway> {
    const response = await api.get<CareerPathwayResponse>(`/pathways/${pathwayId}`);
    return response.data.data;
  },

  async getUserPathways(): Promise<CareerPathway[]> {
    const response = await api.get<{ data: CareerPathway[] }>('/pathways/user');
    return response.data.data;
  },

  async updatePathway(
    pathwayId: string,
    data: UpdatePathwayRequest,
  ): Promise<CareerPathway> {
    const response = await api.put<CareerPathwayResponse>(
      `/pathways/${pathwayId}`,
      data,
    );
    return response.data.data;
  },

  async cloneTemplate(templateId: string, name: string): Promise<CareerPathway> {
    const response = await api.post<CareerPathwayResponse>(
      `/pathways/${templateId}/clone`,
      { name },
    );
    return response.data.data;
  },

  async getTemplates(limit?: number, offset?: number): Promise<PathwayTemplate[]> {
    const response = await api.get<{ data: PathwayTemplate[] }>(
      '/pathways/templates',
      {
        params: { limit, offset },
      },
    );
    return response.data.data;
  },

  async deletePathway(pathwayId: string): Promise<boolean> {
    const response = await api.delete(`/pathways/${pathwayId}`);
    return response.status === 200;
  },

  async sharePathway(
    pathwayId: string,
    visibility: 'public' | 'shared',
  ): Promise<CareerPathway> {
    const response = await api.post<CareerPathwayResponse>(
      `/pathways/${pathwayId}/share`,
      { visibility },
    );
    return response.data.data;
  },

  // Milestones
  async createMilestone(
    pathwayId: string,
    data: {
      title: string;
      description?: string;
      skillsRequired?: string[];
      dueDate: Date;
    },
  ): Promise<Milestone> {
    const response = await api.post<MilestoneResponse>(
      `/milestones`,
      { pathwayId, ...data },
    );
    return response.data.data;
  },

  async getPathwayMilestones(pathwayId: string): Promise<Milestone[]> {
    const response = await api.get<{ data: Milestone[] }>(
      `/milestones/pathway/${pathwayId}`,
    );
    return response.data.data;
  },

  async updateMilestoneProgress(
    milestoneId: string,
    progress: number,
    status?: 'pending' | 'in_progress' | 'completed',
  ): Promise<Milestone> {
    const response = await api.put<MilestoneResponse>(
      `/milestones/${milestoneId}`,
      { progress, status },
    );
    return response.data.data;
  },

  async getUpcomingMilestones(days?: number): Promise<Milestone[]> {
    const response = await api.get<{ data: Milestone[] }>(
      '/milestones/upcoming',
      { params: { days } },
    );
    return response.data.data;
  },
};
