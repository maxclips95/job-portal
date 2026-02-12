/**
 * AI Routes
 * All AI-powered endpoints for resume analysis, job matching, interview prep
 */

import express, { Router } from 'express';
import AIController from '@/controllers/ai.controller';
import { authenticateToken } from '@/middleware/auth';
import multer from 'multer';

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * AI Routes
 * All endpoints require authentication for data privacy
 */

/**
 * POST /api/ai/analyze-resume
 * Upload and analyze resume
 * Returns: extracted skills, sections, and AI analysis
 */
router.post(
  '/analyze-resume',
  authenticateToken,
  upload.single('resume'),
  AIController.analyzeResume
);

/**
 * POST /api/ai/match-job
 * Calculate match score between resume and job
 * Body: { jobId: string, resumeSkills: string[] }
 * Returns: match percentage, matched/missing skills, recommendations
 */
router.post('/match-job', authenticateToken, AIController.matchJob);

/**
 * POST /api/ai/interview-prep
 * Generate interview questions for a specific job
 * Body: { jobId: string }
 * Returns: 5 tailored interview questions
 */
router.post('/interview-prep', authenticateToken, AIController.generateInterviewQuestions);

/**
 * POST /api/ai/cover-letter
 * Generate personalized cover letter
 * Body: { jobId: string, candidateName: string, companyName: string, skills?: string[] }
 * Returns: personalized cover letter text
 */
router.post('/cover-letter', authenticateToken, AIController.generateCoverLetter);

/**
 * POST /api/ai/skill-recommendations
 * Get skill recommendations for a job
 * Body: { jobId: string, currentSkills: string[] }
 * Returns: 5 recommended skills to develop
 */
router.post('/skill-recommendations', authenticateToken, AIController.getSkillRecommendations);

/**
 * POST /api/ai/salary-prediction
 * Predict salary range based on skills and location
 * Body: { skills: string[], experienceLevel: string, location: string }
 * Returns: predicted salary min/max
 */
router.post('/salary-prediction', AIController.predictSalary);

export default router;
