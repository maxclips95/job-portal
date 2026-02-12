import { Request, Response, NextFunction } from 'express';
import { authService } from '@/services/auth.service';
import { validate, registerSchema, loginSchema, sendOTPSchema, verifyOTPSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema } from '@/utils/validation';
import { logger } from '@/utils/logger';
import { ApiResponse } from '@/types/common';
import { UserRole } from '@/types/auth';

/**
 * Auth Controller
 * Handles all authentication endpoints
 * Maps from legacy: ajax_candidateregister.php, ajax_candidatelogin.php, etc.
 */

export class AuthController {
  /**
   * POST /api/auth/register
   * Register new user (candidate or employer)
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = await validate(registerSchema, req.body);
      
      const user = await authService.register(
        validatedData.email,
        validatedData.password,
        validatedData.first_name,
        validatedData.last_name,
        validatedData.phone,
        validatedData.role as UserRole
      );

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: user,
        timestamp: new Date(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Login user with email and password
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = await validate(loginSchema, req.body);
      
      const result = await authService.login(validatedData.email, validatedData.password);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/send-otp
   * Send OTP to email
   */
  static async sendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = await validate(sendOTPSchema, req.body);
      
      await authService.sendOTP(validatedData.email, validatedData.purpose);

      const response: ApiResponse = {
        success: true,
        message: 'OTP sent successfully',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Verify OTP code
   */
  static async verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = await validate(verifyOTPSchema, req.body);
      
      const isValid = await authService.verifyOTP(
        validatedData.email,
        validatedData.otp,
        req.body.purpose || 'login'
      );

      const response: ApiResponse = {
        success: isValid,
        message: isValid ? 'OTP verified successfully' : 'Invalid OTP',
        timestamp: new Date(),
      };

      res.status(isValid ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/otp-login
   * Login with OTP (alternative to password login)
   */
  static async otpLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          timestamp: new Date(),
        });
        return;
      }

      // Verify OTP was valid
      const isOTPVerified = await authService.verifyOTP(email, req.body.otp, 'login');
      
      if (!isOTPVerified) {
        res.status(400).json({
          success: false,
          message: 'Invalid OTP',
          timestamp: new Date(),
        });
        return;
      }

      const user = await authService.getUserByEmail(email);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          timestamp: new Date(),
        });
        return;
      }

      // Generate tokens without password verification
      const result = await authService.login(email, ''); // Will be handled differently
      
      const response: ApiResponse = {
        success: true,
        message: 'OTP login successful',
        data: result,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = await validate(forgotPasswordSchema, req.body);
      
      await authService.requestPasswordReset(validatedData.email);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset email sent',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = await validate(resetPasswordSchema, req.body);
      
      await authService.resetPassword(validatedData.token, validatedData.password);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successful',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh-token
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = await validate(refreshTokenSchema, req.body);
      
      const result = await authService.refreshToken(validatedData.refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: result,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user (invalidate tokens on client side, can be enhanced with token blacklist)
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
