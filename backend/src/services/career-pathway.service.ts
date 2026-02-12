import { injectable, inject } from 'tsyringe';
import db from '../config/database';
import { redis } from '../config/redis';
import {
  CareerPathway,
  Milestone,
  PathwayTemplate,
  SalaryProgression,
  SkillMapping,
  PathwayStatus,
} from '../types/career.types';
import { CareerPathwayValidator } from '../utils/validators/career.validator';

@injectable()
export class CareerPathwayService {
  constructor(
    @inject(CareerPathwayValidator) private validator: CareerPathwayValidator,
  ) {}

  /**
   * Create a new career pathway
   */
  async createPathway(
    userId: string,
    data: {
      name: string;
      description?: string;
      startRole: string;
      targetRole: string;
      timelineYears: number;
      skillsRequired?: string[];
      visibility?: 'private' | 'public' | 'shared';
    },
  ): Promise<CareerPathway> {
    // Validate input
    const validated = this.validator.validatePathwayCreate({
      userId,
      ...data,
    });

    // Calculate salary progression
    const salaryProgression = await this.calculateSalaryProgression(
      data.startRole,
      data.targetRole,
      data.timelineYears,
    );

    // Get skill mapping for roles
    const skillsRequired = await this.getSkillsMappingForRoles(
      data.startRole,
      data.targetRole,
    );

    // Create pathway
    const result = await db('career_pathways').insert(
      {
        userId,
        name: data.name,
        description: data.description || '',
        startRole: data.startRole,
        targetRole: data.targetRole,
        timelineYears: data.timelineYears,
        salaryProgression: JSON.stringify(salaryProgression),
        skillsRequired: JSON.stringify(data.skillsRequired || skillsRequired),
        visibility: data.visibility || 'private',
        status: 'draft' as PathwayStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['id'],
    );

    const pathwayId = result[0].id || result[0];

    // Cache the pathway
    await redis.setex(
      `pathway:${pathwayId}`,
      3600,
      JSON.stringify({
        id: pathwayId,
        userId,
        ...data,
        salaryProgression,
        skillsRequired: data.skillsRequired || skillsRequired,
      }),
    );

    return {
      id: pathwayId,
      userId,
      ...data,
      salaryProgression,
      skillsRequired: data.skillsRequired || skillsRequired,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get career pathway by ID
   */
  async getPathwayById(pathwayId: string, userId?: string): Promise<CareerPathway | null> {
    // Try cache first
    const cached = await redis.get(`pathway:${pathwayId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const pathway = await db('career_pathways')
      .where('id', pathwayId)
      .first();

    if (!pathway) return null;

    // Check visibility
    if (userId && pathway.userId !== userId && pathway.visibility === 'private') {
      return null;
    }

    const formatted = this.formatPathway(pathway);

    // Cache for 1 hour
    await redis.setex(`pathway:${pathwayId}`, 3600, JSON.stringify(formatted));

    return formatted;
  }

  /**
   * Get user's career pathways
   */
  async getUserPathways(userId: string): Promise<CareerPathway[]> {
    const pathways = await db('career_pathways')
      .where('userId', userId)
      .orderBy('createdAt', 'desc');

    return pathways.map(p => this.formatPathway(p));
  }

  /**
   * Update career pathway
   */
  async updatePathway(
    pathwayId: string,
    userId: string,
    data: Partial<{
      name: string;
      description: string;
      targetRole: string;
      timelineYears: number;
      status: PathwayStatus;
    }>,
  ): Promise<CareerPathway> {
    // Verify ownership
    const pathway = await db('career_pathways')
      .where('id', pathwayId)
      .andWhere('userId', userId)
      .first();

    if (!pathway) {
      throw new Error('Pathway not found or unauthorized');
    }

    // Recalculate if needed
    let salaryProgression = pathway.salaryProgression;
    if (data.targetRole || data.timelineYears) {
      salaryProgression = JSON.stringify(
        await this.calculateSalaryProgression(
          pathway.startRole,
          data.targetRole || pathway.targetRole,
          data.timelineYears || pathway.timelineYears,
        ),
      );
    }

    const updateData = {
      ...data,
      ...(salaryProgression && { salaryProgression }),
      updatedAt: new Date(),
    };

    await db('career_pathways').where('id', pathwayId).update(updateData);

    // Invalidate cache
    await redis.del(`pathway:${pathwayId}`);

    return this.getPathwayById(pathwayId, userId) as Promise<CareerPathway>;
  }

  /**
   * Clone a pathway template
   */
  async clonePathwayTemplate(
    templateId: string,
    userId: string,
    name: string,
  ): Promise<CareerPathway> {
    const template = await db('career_pathways').where('id', templateId).first();

    if (!template || template.visibility !== 'public') {
      throw new Error('Template not found or not public');
    }

    return this.createPathway(userId, {
      name,
      description: template.description,
      startRole: template.startRole,
      targetRole: template.targetRole,
      timelineYears: template.timelineYears,
      visibility: 'private',
    });
  }

  /**
   * Get pathway templates
   */
  async getPathwayTemplates(
    limit: number = 10,
    offset: number = 0,
  ): Promise<PathwayTemplate[]> {
    const templates = await db('career_pathways')
      .where('visibility', 'public')
      .limit(limit)
      .offset(offset)
      .orderBy('createdAt', 'desc');

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      startRole: t.startRole,
      targetRole: t.targetRole,
      timelineYears: t.timelineYears,
      skillsRequired: JSON.parse(t.skillsRequired || '[]'),
      salaryProgression: JSON.parse(t.salaryProgression || '[]'),
    }));
  }

  /**
   * Delete pathway
   */
  async deletePathway(pathwayId: string, userId: string): Promise<boolean> {
    const pathway = await db('career_pathways')
      .where('id', pathwayId)
      .andWhere('userId', userId)
      .first();

    if (!pathway) {
      throw new Error('Pathway not found or unauthorized');
    }

    // Delete associated milestones
    await db('milestones').where('pathwayId', pathwayId).del();

    // Delete pathway
    await db('career_pathways').where('id', pathwayId).del();

    // Invalidate cache
    await redis.del(`pathway:${pathwayId}`);

    return true;
  }

  /**
   * Create milestone
   */
  async createMilestone(
    pathwayId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      skillsRequired?: string[];
      dueDate: Date;
      sequence?: number;
    },
  ): Promise<Milestone> {
    // Verify pathway ownership
    const pathway = await db('career_pathways')
      .where('id', pathwayId)
      .andWhere('userId', userId)
      .first();

    if (!pathway) {
      throw new Error('Pathway not found or unauthorized');
    }

    const result = await db('milestones').insert(
      {
        pathwayId,
        title: data.title,
        description: data.description || '',
        skillsRequired: data.skillsRequired ? JSON.stringify(data.skillsRequired) : null,
        dueDate: data.dueDate,
        status: 'pending',
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ['id'],
    );

    const milestoneId = result[0].id || result[0];

    // Invalidate pathway cache
    await redis.del(`pathway:${pathwayId}`);

    return {
      id: milestoneId,
      pathwayId,
      title: data.title,
      description: data.description || '',
      skillsRequired: data.skillsRequired || [],
      dueDate: data.dueDate,
      status: 'pending',
      progressPercentage: 0,
      createdAt: new Date(),
    };
  }

  /**
   * Get pathway milestones
   */
  async getPathwayMilestones(pathwayId: string): Promise<Milestone[]> {
    const milestones = await db('milestones')
      .where('pathwayId', pathwayId)
      .orderBy('dueDate', 'asc');

    return milestones.map(m => this.formatMilestone(m));
  }

  /**
   * Update milestone progress
   */
  async updateMilestoneProgress(
    milestoneId: string,
    userId: string,
    progress: number,
    status?: 'pending' | 'in_progress' | 'completed',
  ): Promise<Milestone> {
    // Verify ownership via pathway
    const milestone = await db('milestones')
      .join('career_pathways', 'milestones.pathwayId', 'career_pathways.id')
      .where('milestones.id', milestoneId)
      .andWhere('career_pathways.userId', userId)
      .first();

    if (!milestone) {
      throw new Error('Milestone not found or unauthorized');
    }

    const updateData: any = {
      progressPercentage: Math.min(progress, 100),
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    await db('milestones').where('id', milestoneId).update(updateData);

    // Invalidate pathway cache
    await redis.del(`pathway:${milestone.pathwayId}`);

    return this.getMilestoneById(milestoneId, userId) as Promise<Milestone>;
  }

  /**
   * Get milestone by ID
   */
  async getMilestoneById(milestoneId: string, userId?: string): Promise<Milestone | null> {
    const milestone = await db('milestones')
      .join('career_pathways', 'milestones.pathwayId', 'career_pathways.id')
      .select('milestones.*')
      .where('milestones.id', milestoneId)
      .first();

    if (!milestone) return null;

    if (userId && milestone.userId !== userId) {
      return null;
    }

    return this.formatMilestone(milestone);
  }

  /**
   * Get upcoming milestones for user
   */
  async getUpcomingMilestones(
    userId: string,
    days: number = 30,
  ): Promise<Milestone[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const milestones = await db('milestones')
      .join('career_pathways', 'milestones.pathwayId', 'career_pathways.id')
      .select('milestones.*')
      .where('career_pathways.userId', userId)
      .andWhere('milestones.status', '!=', 'completed')
      .andWhereBetween('milestones.dueDate', [new Date(), futureDate])
      .orderBy('milestones.dueDate', 'asc');

    return milestones.map(m => this.formatMilestone(m));
  }

  /**
   * Calculate salary progression based on roles
   */
  private async calculateSalaryProgression(
    startRole: string,
    targetRole: string,
    yearsToTarget: number,
  ): Promise<SalaryProgression[]> {
    const progressions: SalaryProgression[] = [];
    const steps = Math.min(yearsToTarget, 5); // Max 5 steps

    // Get salary data for both roles
    const startSalary = await this.getAverageSalaryForRole(startRole);
    const targetSalary = await this.getAverageSalaryForRole(targetRole);

    const salaryDiff = targetSalary - startSalary;
    const yearIncrement = yearsToTarget / steps;

    for (let i = 0; i <= steps; i++) {
      const year = i * yearIncrement;
      const salary = startSalary + (salaryDiff * i) / steps;

      progressions.push({
        year: Math.round(year),
        salary: Math.round(salary),
        role: i === steps ? targetRole : startRole,
        milestone: `Year ${Math.round(year)}: ${salary}`,
      });
    }

    return progressions;
  }

  /**
   * Get average salary for a role
   */
  private async getAverageSalaryForRole(role: string): Promise<number> {
    // Try cache
    const cached = await redis.get(`role_salary:${role}`);
    if (cached) {
      return parseFloat(cached);
    }

    const result = await db('salary_data')
      .where('role', 'ilike', `%${role}%`)
      .avg('salary as avgSalary')
      .first();

    const avgSalary = result?.avgSalary || 60000; // Default fallback

    // Cache for 24 hours
    await redis.setex(`role_salary:${role}`, 86400, avgSalary.toString());

    return avgSalary;
  }

  /**
   * Get skills mapping for roles
   */
  private async getSkillsMappingForRoles(
    startRole: string,
    targetRole: string,
  ): Promise<SkillMapping[]> {
    const mapping: SkillMapping[] = [];

    // Get required skills for start role
    const startSkills = await db('role_required_skills')
      .where('role', 'ilike', `%${startRole}%`)
      .select('skill', 'level', 'importance');

    // Get required skills for target role
    const targetSkills = await db('role_required_skills')
      .where('role', 'ilike', `%${targetRole}%`)
      .select('skill', 'level', 'importance');

    // Create mapping
    targetSkills.forEach(skill => {
      const hasSkill = startSkills.some(s => s.skill === skill.skill);

      mapping.push({
        skill: skill.skill,
        currentLevel: hasSkill ? startSkills.find(s => s.skill === skill.skill)?.level || 0 : 0,
        targetLevel: skill.level,
        importance: skill.importance,
        timeToLearn: this.estimateTimeToLearn(skill.level),
      });
    });

    return mapping;
  }

  /**
   * Estimate time to learn a skill
   */
  private estimateTimeToLearn(targetLevel: number): number {
    const hoursByLevel: Record<number, number> = {
      1: 20,
      2: 60,
      3: 150,
      4: 300,
      5: 500,
    };

    return hoursByLevel[targetLevel] || 100;
  }

  /**
   * Share pathway with others
   */
  async sharePathway(
    pathwayId: string,
    userId: string,
    visibility: 'public' | 'shared',
  ): Promise<CareerPathway> {
    const pathway = await db('career_pathways')
      .where('id', pathwayId)
      .andWhere('userId', userId)
      .first();

    if (!pathway) {
      throw new Error('Pathway not found or unauthorized');
    }

    await db('career_pathways')
      .where('id', pathwayId)
      .update({ visibility, updatedAt: new Date() });

    await redis.del(`pathway:${pathwayId}`);

    return this.getPathwayById(pathwayId, userId) as Promise<CareerPathway>;
  }

  /**
   * Helper: Format pathway from database
   */
  private formatPathway(pathway: any): CareerPathway {
    return {
      id: pathway.id,
      userId: pathway.userId,
      name: pathway.name,
      description: pathway.description,
      startRole: pathway.startRole,
      targetRole: pathway.targetRole,
      timelineYears: pathway.timelineYears,
      salaryProgression: JSON.parse(pathway.salaryProgression || '[]'),
      skillsRequired: JSON.parse(pathway.skillsRequired || '[]'),
      visibility: pathway.visibility,
      status: pathway.status,
      createdAt: pathway.createdAt,
      updatedAt: pathway.updatedAt,
    };
  }

  /**
   * Helper: Format milestone from database
   */
  private formatMilestone(milestone: any): Milestone {
    return {
      id: milestone.id,
      pathwayId: milestone.pathwayId,
      title: milestone.title,
      description: milestone.description,
      skillsRequired: milestone.skillsRequired ? JSON.parse(milestone.skillsRequired) : [],
      dueDate: milestone.dueDate,
      status: milestone.status,
      progressPercentage: milestone.progressPercentage,
      completedAt: milestone.completedAt,
      createdAt: milestone.createdAt,
    };
  }
}
