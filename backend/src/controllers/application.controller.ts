import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '@/services/application.service';
import { Logger } from '@/utils/logger';

const logger = new Logger('ApplicationController');

export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  /**
   * POST /api/applications/jobs/:jobId/apply
   * Apply for a job
   */
  async applyForJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const { coverLetter, resumeUrl } = req.body;
      const candidateId = (req as any).user.userId;

      const application = await this.applicationService.applyForJob(
        jobId,
        candidateId,
        coverLetter,
        resumeUrl
      );

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: application,
      });
    } catch (error: any) {
      logger.error('Error applying for job:', error);
      res.status(error.message.includes('already applied') ? 400 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/jobs/:jobId
   * Get all applications for a job (employer only)
   */
  async getJobApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;
      const employerId = (req as any).user.userId;

      const result = await this.applicationService.getJobApplications(
        jobId,
        employerId,
        status as string | undefined,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          applications: result.applications,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            pages: Math.ceil(result.total / parseInt(limit as string)),
          },
        },
      });
    } catch (error: any) {
      logger.error('Error fetching job applications:', error);
      res.status(error.message.includes('unauthorized') ? 403 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/my-applications
   * Get applications for logged-in candidate
   */
  async getCandidateApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = (req as any).user.userId;
      const { page = 1, limit = 10 } = req.query;

      const result = await this.applicationService.getCandidateApplications(
        candidateId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          applications: result.applications,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            pages: Math.ceil(result.total / parseInt(limit as string)),
          },
        },
      });
    } catch (error: any) {
      logger.error('Error fetching candidate applications:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/:applicationId
   * Get application details
   */
  async getApplicationDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;

      const application = await this.applicationService.getApplicationDetails(applicationId);

      res.json({
        success: true,
        data: application,
      });
    } catch (error: any) {
      logger.error('Error fetching application details:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/applications/:applicationId/status
   * Update application status
   */
  async updateApplicationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const { status } = req.body;
      const employerId = (req as any).user.userId;

      if (!['applied', 'reviewed', 'shortlisted', 'rejected', 'accepted', 'withdrawn'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
        return;
      }

      const application = await this.applicationService.updateApplicationStatus(
        applicationId,
        status,
        employerId
      );

      res.json({
        success: true,
        message: 'Application status updated',
        data: application,
      });
    } catch (error: any) {
      logger.error('Error updating application status:', error);
      res.status(error.message.includes('unauthorized') ? 403 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/applications/:applicationId/rate
   * Rate an application
   */
  async rateApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const { rating, notes } = req.body;
      const employerId = (req as any).user.userId;

      if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating must be a number between 0 and 5',
        });
        return;
      }

      const application = await this.applicationService.rateApplication(
        applicationId,
        rating,
        notes,
        employerId
      );

      res.json({
        success: true,
        message: 'Application rated successfully',
        data: application,
      });
    } catch (error: any) {
      logger.error('Error rating application:', error);
      res.status(error.message.includes('unauthorized') ? 403 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/applications/:applicationId/withdraw
   * Withdraw an application
   */
  async withdrawApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const candidateId = (req as any).user.userId;

      const application = await this.applicationService.withdrawApplication(
        applicationId,
        candidateId
      );

      res.json({
        success: true,
        message: 'Application withdrawn successfully',
        data: application,
      });
    } catch (error: any) {
      logger.error('Error withdrawing application:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/applications/:applicationId/interviews
   * Schedule interview
   */
  async scheduleInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const { interviewType, scheduledAt, durationMinutes, interviewLink, interviewerId } = req.body;
      const employerId = (req as any).user?.userId;

      if (!['phone', 'video', 'in_person', 'written'].includes(interviewType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid interview type',
        });
        return;
      }

      const interview = await this.applicationService.scheduleInterview(
        applicationId,
        interviewType,
        new Date(scheduledAt),
        durationMinutes,
        interviewLink,
        interviewerId,
        employerId
      );

      res.status(201).json({
        success: true,
        message: 'Interview scheduled successfully',
        data: interview,
      });
    } catch (error: any) {
      logger.error('Error scheduling interview:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/:applicationId/interviews
   * Get interviews for an application
   */
  async getApplicationInterviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;

      const interviews = await this.applicationService.getApplicationInterviews(applicationId);

      res.json({
        success: true,
        data: interviews,
      });
    } catch (error: any) {
      logger.error('Error fetching interviews:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/applications/interviews/:interviewId
   * Update interview
   */
  async updateInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const { interviewId } = req.params;
      const updates = req.body;

      const interview = await this.applicationService.updateInterview(interviewId, updates);

      res.json({
        success: true,
        message: 'Interview updated successfully',
        data: interview,
      });
    } catch (error: any) {
      logger.error('Error updating interview:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/applications/:applicationId/offer
   * Create job offer
   */
  async createJobOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const { positionTitle, salary, benefits, startDate, expirationDate } = req.body;
      const employerId = (req as any).user?.userId;

      const offer = await this.applicationService.createJobOffer(
        applicationId,
        positionTitle,
        salary,
        benefits,
        new Date(startDate),
        new Date(expirationDate),
        employerId
      );

      res.status(201).json({
        success: true,
        message: 'Job offer created successfully',
        data: offer,
      });
    } catch (error: any) {
      logger.error('Error creating job offer:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/offers/:offerId
   * Get job offer
   */
  async getJobOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { offerId } = req.params;

      const offer = await this.applicationService.getJobOffer(offerId);

      res.json({
        success: true,
        data: offer,
      });
    } catch (error: any) {
      logger.error('Error fetching job offer:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/applications/offers/:offerId/status
   * Update job offer status
   */
  async updateOfferStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { offerId } = req.params;
      const { status } = req.body;

      if (!['pending', 'accepted', 'rejected', 'expired'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid offer status',
        });
        return;
      }

      const offer = await this.applicationService.updateOfferStatus(offerId, status);

      res.json({
        success: true,
        message: 'Offer status updated successfully',
        data: offer,
      });
    } catch (error: any) {
      logger.error('Error updating offer status:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/my-interviews
   * Get interviews for logged-in candidate
   */
  async getMyInterviews(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const interviews = await this.applicationService.getCandidateInterviews(candidateId);

      res.json({
        success: true,
        data: interviews,
      });
    } catch (error: any) {
      logger.error('Error fetching my interviews:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/interviews/:interviewId
   * Get single interview for logged-in candidate
   */
  async getMyInterviewById(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const { interviewId } = req.params;
      const interview = await this.applicationService.getCandidateInterviewById(
        interviewId,
        candidateId
      );

      res.json({
        success: true,
        data: interview,
      });
    } catch (error: any) {
      logger.error('Error fetching my interview by id:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/applications/interviews/:interviewId/reschedule
   */
  async rescheduleMyInterview(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const { interviewId } = req.params;
      const { newDate } = req.body;

      const updated = await this.applicationService.rescheduleCandidateInterview(
        interviewId,
        candidateId,
        new Date(newDate)
      );

      res.json({
        success: true,
        message: 'Interview rescheduled successfully',
        data: updated,
      });
    } catch (error: any) {
      logger.error('Error rescheduling my interview:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/applications/interviews/:interviewId/feedback
   */
  async submitMyInterviewFeedback(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const { interviewId } = req.params;
      const { feedback } = req.body;

      if (!feedback || !String(feedback).trim()) {
        res.status(400).json({
          success: false,
          message: 'Feedback is required',
        });
        return;
      }

      const updated = await this.applicationService.submitCandidateInterviewFeedback(
        interviewId,
        candidateId,
        String(feedback)
      );

      res.json({
        success: true,
        message: 'Interview feedback submitted',
        data: updated,
      });
    } catch (error: any) {
      logger.error('Error submitting my interview feedback:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/my-offers
   */
  async getMyOffers(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const offers = await this.applicationService.getCandidateOffers(candidateId);

      res.json({
        success: true,
        data: offers,
      });
    } catch (error: any) {
      logger.error('Error fetching my offers:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/my-offers/:offerId
   */
  async getMyOfferById(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const { offerId } = req.params;
      const offer = await this.applicationService.getCandidateOfferById(offerId, candidateId);

      res.json({
        success: true,
        data: offer,
      });
    } catch (error: any) {
      logger.error('Error fetching my offer by id:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/applications/offers/:offerId/accept
   */
  async acceptMyOffer(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const { offerId } = req.params;
      const offer = await this.applicationService.updateCandidateOfferStatus(
        offerId,
        candidateId,
        'accepted'
      );

      res.json({
        success: true,
        message: 'Offer accepted successfully',
        data: offer,
      });
    } catch (error: any) {
      logger.error('Error accepting my offer:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/applications/offers/:offerId/reject
   */
  async rejectMyOffer(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const { offerId } = req.params;
      const offer = await this.applicationService.updateCandidateOfferStatus(
        offerId,
        candidateId,
        'rejected'
      );

      res.json({
        success: true,
        message: 'Offer rejected successfully',
        data: offer,
      });
    } catch (error: any) {
      logger.error('Error rejecting my offer:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/applications/statistics
   */
  async getCandidateStatistics(req: Request, res: Response) {
    try {
      const candidateId = (req as any).user.userId;
      const stats = await this.applicationService.getCandidateApplicationStatistics(candidateId);
      res.json(stats);
    } catch (error: any) {
      logger.error('Error fetching candidate statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
