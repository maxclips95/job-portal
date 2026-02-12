/**
 * Email Service
 * Handles all email communications including OTP, password reset, and notifications
 * Uses Nodemailer with production-ready retry logic and error handling
 */

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
}

interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

class EmailService {
  private transporter: any = null;
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  /**
   * Initialize email transporter
   * Supports SMTP and Gmail configurations
   */
  async initialize(): Promise<void> {
    try {
      const emailConfig = this.getEmailConfig();
      
      this.transporter = nodemailer.createTransport(emailConfig);

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully', { service: 'EmailService' });
    } catch (error) {
      logger.error('Failed to initialize email service', { error, service: 'EmailService' });
      // Don't throw - allow app to continue without email service
      // Implement fallback or queue system in production
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOTPEmail(email: string, otp: string, userType: 'candidate' | 'employer'): Promise<boolean> {
    const subject = 'Email Verification - Job Portal';
    const html = this.renderOTPTemplate(otp, userType);
    
    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your OTP is: ${otp}. Valid for 10 minutes.`
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
    const subject = 'Reset Your Password - Job Portal';
    const html = this.renderPasswordResetTemplate(resetUrl, email);
    
    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Click here to reset your password: ${resetUrl}`
    });
  }

  /**
   * Send job application confirmation
   */
  async sendApplicationConfirmation(
    email: string,
    candidateName: string,
    jobTitle: string,
    companyName: string
  ): Promise<boolean> {
    const subject = `Application Received - ${jobTitle} at ${companyName}`;
    const html = this.renderApplicationConfirmationTemplate(
      candidateName,
      jobTitle,
      companyName
    );
    
    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your application for ${jobTitle} has been received.`
    });
  }

  /**
   * Send interview scheduled notification
   */
  async sendInterviewScheduledEmail(
    email: string,
    candidateName: string,
    jobTitle: string,
    interviewDate: Date,
    interviewType: string,
    meetingLink?: string
  ): Promise<boolean> {
    const subject = `Interview Scheduled - ${jobTitle}`;
    const html = this.renderInterviewScheduledTemplate(
      candidateName,
      jobTitle,
      interviewDate,
      interviewType,
      meetingLink
    );
    
    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Your interview is scheduled for ${interviewDate.toLocaleString()}`
    });
  }

  /**
   * Send job offer email
   */
  async sendJobOfferEmail(
    email: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    salary: number,
    startDate: Date
  ): Promise<boolean> {
    const subject = `Job Offer - ${jobTitle} at ${companyName}`;
    const html = this.renderJobOfferTemplate(
      candidateName,
      jobTitle,
      companyName,
      salary,
      startDate
    );
    
    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `Congratulations! You have received a job offer for ${jobTitle}.`
    });
  }

  /**
   * Send notification email to employer
   */
  async sendEmployerNotification(
    email: string,
    subject: string,
    message: string,
    actionUrl?: string
  ): Promise<boolean> {
    const html = this.renderNotificationTemplate(message, actionUrl);
    
    return this.sendEmail({
      to: email,
      subject,
      html,
      text: message
    });
  }

  /**
   * Send bulk email (e.g., newsletter)
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    text: string
  ): Promise<boolean> {
    if (recipients.length === 0) {
      logger.warn('No recipients provided for bulk email', { service: 'EmailService' });
      return false;
    }

    try {
      // Split into chunks to avoid overwhelming the SMTP server
      const chunkSize = 50;
      for (let i = 0; i < recipients.length; i += chunkSize) {
        const chunk = recipients.slice(i, i + chunkSize);
        
        for (const email of chunk) {
          await this.sendEmail({
            to: email,
            subject,
            html,
            text
          });
        }
      }
      
      logger.info('Bulk email sent successfully', {
        recipientCount: recipients.length,
        service: 'EmailService'
      });
      return true;
    } catch (error) {
      logger.error('Failed to send bulk email', { error, service: 'EmailService' });
      return false;
    }
  }

  /**
   * Core email sending logic with retry mechanism
   */
  private async sendEmail(options: EmailOptions, attempt: number = 1): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not initialized. Email not sent.', { 
        to: options.to,
        service: 'EmailService' 
      });
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@jobportal.com',
        ...options
      });

      logger.info('Email sent successfully', {
        to: options.to,
        messageId: info.messageId,
        service: 'EmailService'
      });
      return true;
    } catch (error) {
      logger.error(`Failed to send email (attempt ${attempt}/${this.maxRetries})`, {
        to: options.to,
        error,
        service: 'EmailService'
      });

      // Retry logic
      if (attempt < this.maxRetries) {
        await this.delay(this.retryDelay * attempt); // Exponential backoff
        return this.sendEmail(options, attempt + 1);
      }

      return false;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get email configuration based on environment
   */
  private getEmailConfig() {
    const useGmail = process.env.EMAIL_PROVIDER === 'gmail';

    if (useGmail) {
      return {
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD // Use app-specific password
        }
      };
    }

    // SMTP configuration
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };
  }

  /**
   * Email Templates
   */

  private renderOTPTemplate(otp: string, userType: 'candidate' | 'employer'): string {
    const userTypeLabel = userType === 'candidate' ? 'Candidate' : 'Employer';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: white; padding: 20px; margin-top: 20px; border-radius: 5px; }
            .otp-box { background-color: #f0f0f0; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; padding: 10px; border-radius: 3px; color: #856404; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verification</h1>
            </div>
            <div class="content">
              <p>Hello ${userTypeLabel},</p>
              <p>Welcome to Job Portal! To complete your ${userTypeLabel.toLowerCase()} registration, please verify your email using the code below:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <p><strong>This code will expire in 10 minutes.</strong></p>
              
              <div class="warning">
                ⚠️ Do not share this code with anyone. We will never ask for this code via email or phone.
              </div>
              
              <p>If you didn't request this code, you can safely ignore this email.</p>
              
              <p>Best regards,<br>The Job Portal Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Job Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private renderPasswordResetTemplate(resetUrl: string, email: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #FF6B6B; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: white; padding: 20px; margin-top: 20px; border-radius: 5px; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; padding: 10px; border-radius: 3px; color: #856404; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset the password for your account associated with <strong>${email}</strong>.</p>
              
              <p>Click the button below to reset your password. This link will expire in 1 hour:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>Or copy and paste this link in your browser:<br>
              <code style="background-color: #f0f0f0; padding: 10px; display: block; word-break: break-all;">${resetUrl}</code></p>
              
              <div class="warning">
                ⚠️ If you didn't request a password reset, please ignore this email or contact support if you believe this was a mistake.
              </div>
              
              <p>For security reasons, do not share this link with anyone.</p>
              
              <p>Best regards,<br>The Job Portal Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Job Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private renderApplicationConfirmationTemplate(
    candidateName: string,
    jobTitle: string,
    companyName: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: white; padding: 20px; margin-top: 20px; border-radius: 5px; }
            .job-details { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Received ✓</h1>
            </div>
            <div class="content">
              <p>Hi ${candidateName},</p>
              <p>Your application has been successfully submitted!</p>
              
              <div class="job-details">
                <h3>Position Details</h3>
                <p><strong>Job Title:</strong> ${jobTitle}</p>
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Submitted on:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>We have received your application and will review it soon. You'll receive email updates about the status of your application.</p>
              
              <p>In the meantime, you can:</p>
              <ul>
                <li>Continue exploring other jobs</li>
                <li>Update your profile with additional information</li>
                <li>Save jobs for later</li>
              </ul>
              
              <a href="${process.env.FRONTEND_URL}/candidate/applications" class="button">View My Applications</a>
              
              <p>Best regards,<br>The Job Portal Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Job Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private renderInterviewScheduledTemplate(
    candidateName: string,
    jobTitle: string,
    interviewDate: Date,
    interviewType: string,
    meetingLink?: string
  ): string {
    const dateStr = interviewDate.toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: white; padding: 20px; margin-top: 20px; border-radius: 5px; }
            .interview-details { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #9C27B0; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Interview Scheduled 📅</h1>
            </div>
            <div class="content">
              <p>Hi ${candidateName},</p>
              <p>Great news! Your interview has been scheduled for the position of <strong>${jobTitle}</strong>.</p>
              
              <div class="interview-details">
                <h3>Interview Details</h3>
                <p><strong>Date & Time:</strong> ${dateStr}</p>
                <p><strong>Interview Type:</strong> ${this.formatInterviewType(interviewType)}</p>
                ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
              </div>
              
              <p>Please make sure to:</p>
              <ul>
                <li>Join 5-10 minutes early</li>
                <li>Test your audio and video (for video interviews)</li>
                <li>Choose a quiet location with good lighting</li>
                <li>Have your resume and documents ready</li>
              </ul>
              
              <a href="${process.env.FRONTEND_URL}/candidate/interviews" class="button">View Interview Details</a>
              
              <p>If you need to reschedule, please contact the employer directly.</p>
              
              <p>Best of luck! We're rooting for you!</p>
              <p>Best regards,<br>The Job Portal Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Job Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private renderJobOfferTemplate(
    candidateName: string,
    jobTitle: string,
    companyName: string,
    salary: number,
    startDate: Date
  ): string {
    const formattedSalary = salary.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    const startDateStr = startDate.toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: white; padding: 20px; margin-top: 20px; border-radius: 5px; }
            .offer-details { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
            .salary { font-size: 24px; font-weight: bold; color: #4CAF50; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 5px 10px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .congratulations { font-size: 20px; font-weight: bold; color: #4CAF50; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Job Offer!</h1>
            </div>
            <div class="content">
              <p class="congratulations">Congratulations, ${candidateName}!</p>
              <p>We are pleased to offer you the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
              
              <div class="offer-details">
                <h3>Offer Details</h3>
                <p><strong>Position:</strong> ${jobTitle}</p>
                <p><strong>Company:</strong> ${companyName}</p>
                <p><strong>Annual Salary:</strong> <span class="salary">${formattedSalary}</span></p>
                <p><strong>Start Date:</strong> ${startDateStr}</p>
              </div>
              
              <p>We were impressed by your skills, experience, and enthusiasm during the interview process. We believe you will be a great addition to our team.</p>
              
              <p>Please review the attached offer letter for complete details regarding compensation, benefits, and other terms of employment.</p>
              
              <p>
                <a href="${process.env.FRONTEND_URL}/candidate/offers" class="button">View Full Offer</a>
                <a href="#" class="button" style="background-color: #2196F3;">Ask Questions</a>
              </p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Review the complete offer letter</li>
                <li>Accept or request modifications within 5 business days</li>
                <li>Complete any final onboarding requirements</li>
              </ul>
              
              <p>If you have any questions about this offer, please don't hesitate to contact our HR team.</p>
              
              <p>We look forward to welcoming you to our team!</p>
              <p>Best regards,<br>The Job Portal Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Job Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private renderNotificationTemplate(message: string, actionUrl?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: white; padding: 20px; margin-top: 20px; border-radius: 5px; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Notification</h1>
            </div>
            <div class="content">
              <p>${message}</p>
              ${actionUrl ? `<a href="${actionUrl}" class="button">View Details</a>` : ''}
              <p>Best regards,<br>The Job Portal Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Job Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Helper to format interview type
   */
  private formatInterviewType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'phone': '☎️ Phone Interview',
      'video': '📹 Video Interview',
      'in-person': '🏢 In-Person Interview',
      'written': '✍️ Written Test'
    };
    return typeMap[type.toLowerCase()] || type;
  }
}

export const emailService = new EmailService();
