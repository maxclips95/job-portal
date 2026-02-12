import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationController } from '@/controllers/application.controller';
import { ApplicationService } from '@/services/application.service';
import { authenticateToken } from '@/middleware/auth';
import { db } from '@/utils/database';

const router = Router();
const applicationService = new ApplicationService(db);
const applicationController = new ApplicationController(applicationService);

// Apply for a job (candidate)
router.post(
  '/jobs/:jobId/apply',
  authenticateToken,
  (req, res, next) => applicationController.applyForJob(req, res, next)
);

// Get applications for a job (employer)
router.get(
  '/jobs/:jobId',
  authenticateToken,
  (req, res, next) => applicationController.getJobApplications(req, res, next)
);

// Get candidate's applications
router.get(
  '/my-applications',
  authenticateToken,
  (req, res, next) => applicationController.getCandidateApplications(req, res, next)
);

// Candidate statistics
router.get(
  '/statistics',
  authenticateToken,
  (req, res) => applicationController.getCandidateStatistics(req, res)
);

// Candidate interviews
router.get(
  '/my-interviews',
  authenticateToken,
  (req, res) => applicationController.getMyInterviews(req, res)
);
router.get(
  '/interviews/:interviewId',
  authenticateToken,
  (req, res) => applicationController.getMyInterviewById(req, res)
);
router.put(
  '/interviews/:interviewId/reschedule',
  authenticateToken,
  (req, res) => applicationController.rescheduleMyInterview(req, res)
);
router.post(
  '/interviews/:interviewId/feedback',
  authenticateToken,
  (req, res) => applicationController.submitMyInterviewFeedback(req, res)
);

// Candidate offers
router.get(
  '/my-offers',
  authenticateToken,
  (req, res) => applicationController.getMyOffers(req, res)
);
router.get(
  '/my-offers/:offerId',
  authenticateToken,
  (req, res) => applicationController.getMyOfferById(req, res)
);
router.post(
  '/offers/:offerId/accept',
  authenticateToken,
  (req, res) => applicationController.acceptMyOffer(req, res)
);
router.post(
  '/offers/:offerId/reject',
  authenticateToken,
  (req, res) => applicationController.rejectMyOffer(req, res)
);

// Get application details
router.get(
  '/:applicationId',
  authenticateToken,
  (req, res, next) => applicationController.getApplicationDetails(req, res, next)
);

// Update application status
router.patch(
  '/:applicationId/status',
  authenticateToken,
  (req, res, next) => applicationController.updateApplicationStatus(req, res, next)
);

// Rate application
router.post(
  '/:applicationId/rate',
  authenticateToken,
  (req, res, next) => applicationController.rateApplication(req, res, next)
);

// Withdraw application
router.post(
  '/:applicationId/withdraw',
  authenticateToken,
  (req, res, next) => applicationController.withdrawApplication(req, res, next)
);

// Schedule interview
router.post(
  '/:applicationId/interviews',
  authenticateToken,
  (req, res, next) => applicationController.scheduleInterview(req, res, next)
);

// Get interviews for application
router.get(
  '/:applicationId/interviews',
  authenticateToken,
  (req, res, next) => applicationController.getApplicationInterviews(req, res, next)
);

// Update interview
router.patch(
  '/interviews/:interviewId',
  authenticateToken,
  (req, res, next) => applicationController.updateInterview(req, res, next)
);

// Create job offer
router.post(
  '/:applicationId/offer',
  authenticateToken,
  (req, res, next) => applicationController.createJobOffer(req, res, next)
);

// Get job offer
router.get(
  '/offers/:offerId',
  authenticateToken,
  (req, res, next) => applicationController.getJobOffer(req, res, next)
);

// Update offer status
router.patch(
  '/offers/:offerId/status',
  authenticateToken,
  (req, res, next) => applicationController.updateOfferStatus(req, res, next)
);

export default router;
