/**
 * AI Controller
 * Handles resume analysis, job matching, and interview prep endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { aiService } from '@/services/ai.service';
import { groqService } from '@/services/groq.service';
import { resumeParserService } from '@/services/resume.parser.service';
import { jobService } from '@/services/job.service';
import { logger } from '@/utils/logger';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export class AIController {
  /**
   * POST /api/ai/analyze-resume
   * Upload and analyze resume
   */
  static async analyzeResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No resume file provided',
          timestamp: new Date()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          timestamp: new Date()
        });
        return;
      }

      // Parse resume
      const parsed = await resumeParserService.parseResumePDF(req.file.buffer);
      
      // Extract skills
      const skills = await aiService.extractSkillsFromResume(parsed.fullText);

      // Groq analysis
      const analysis = await groqService.analyzeResumeContent(parsed.fullText);

      const response = {
        success: true,
        message: 'Resume analyzed successfully',
        data: {
          extractedSkills: skills,
          sections: parsed.sections,
          analysis: analysis
        },
        timestamp: new Date()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error analyzing resume:', error);
      next(error);
    }
  }

  /**
   * POST /api/ai/match-job
   * Calculate job match score
   * Body: { jobId: string, resumeSkills?: string[] }
   */
  static async matchJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId, resumeSkills } = req.body;

      if (!jobId || !resumeSkills || !Array.isArray(resumeSkills)) {
        res.status(400).json({
          success: false,
          message: 'jobId and resumeSkills array required',
          timestamp: new Date()
        });
        return;
      }

      // Get job details
      const job = await jobService.getJobById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Job not found',
          timestamp: new Date()
        });
        return;
      }

      // Calculate match
      const jobRequirements = job.requirements || [];
      const match = await aiService.calculateJobMatch(
        resumeSkills,
        job.title,
        job.description,
        jobRequirements
      );

      const response = {
        success: true,
        message: 'Job match calculated',
        data: {
          jobId,
          jobTitle: job.title,
          ...match
        },
        timestamp: new Date()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error matching job:', error);
      next(error);
    }
  }

  /**
   * POST /api/ai/interview-prep
   * Generate interview questions for a job
   * Body: { jobId: string }
   */
  static async generateInterviewQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.body;

      if (!jobId) {
        res.status(400).json({
          success: false,
          message: 'jobId required',
          timestamp: new Date()
        });
        return;
      }

      // Get job details
      const job = await jobService.getJobById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Job not found',
          timestamp: new Date()
        });
        return;
      }

      // Generate questions
      const questions = await groqService.generateInterviewQuestions(
        job.title,
        job.description
      );

      const response = {
        success: true,
        message: 'Interview questions generated',
        data: {
          jobId,
          jobTitle: job.title,
          questions
        },
        timestamp: new Date()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error generating interview questions:', error);
      next(error);
    }
  }

  /**
   * POST /api/ai/cover-letter
   * Generate personalized cover letter
   * Body: { jobId: string, candidateName: string, companyName: string }
   */
  static async generateCoverLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId, candidateName, companyName, skills } = req.body;

      if (!jobId || !candidateName || !companyName) {
        res.status(400).json({
          success: false,
          message: 'jobId, candidateName, and companyName required',
          timestamp: new Date()
        });
        return;
      }

      // Get job details
      const job = await jobService.getJobById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Job not found',
          timestamp: new Date()
        });
        return;
      }

      // Generate cover letter
      const coverLetter = await groqService.generateCoverLetter(
        candidateName,
        job.title,
        companyName,
        skills || []
      );

      const response = {
        success: true,
        message: 'Cover letter generated',
        data: {
          jobId,
          jobTitle: job.title,
          coverLetter
        },
        timestamp: new Date()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error generating cover letter:', error);
      next(error);
    }
  }

  /**
   * POST /api/ai/skill-recommendations
   * Get skill recommendations for a job
   * Body: { jobId: string, currentSkills: string[] }
   */
  static async getSkillRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId, currentSkills } = req.body;

      if (!jobId || !Array.isArray(currentSkills)) {
        res.status(400).json({
          success: false,
          message: 'jobId and currentSkills array required',
          timestamp: new Date()
        });
        return;
      }

      // Get job details
      const job = await jobService.getJobById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Job not found',
          timestamp: new Date()
        });
        return;
      }

      // Get recommendations
      const recommendations = await groqService.getSkillRecommendations(
        currentSkills,
        job.title
      );

      const response = {
        success: true,
        message: 'Skill recommendations generated',
        data: {
          jobId,
          jobTitle: job.title,
          recommendations
        },
        timestamp: new Date()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting skill recommendations:', error);
      next(error);
    }
  }

  /**
   * POST /api/ai/salary-prediction
   * Predict salary range
   * Body: { skills: string[], experienceLevel: string, location: string }
   */
  static async predictSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { skills, experienceLevel, location } = req.body;

      if (!skills || !experienceLevel || !location) {
        res.status(400).json({
          success: false,
          message: 'skills, experienceLevel, and location required',
          timestamp: new Date()
        });
        return;
      }

      const salary = await aiService.predictSalaryRange(
        skills,
        experienceLevel,
        location
      );

      const response = {
        success: true,
        message: 'Salary prediction generated',
        data: salary,
        timestamp: new Date()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error predicting salary:', error);
      next(error);
    }
  }
}

export default AIController;
