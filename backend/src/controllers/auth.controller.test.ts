/**
 * Auth Controller Unit Tests
 * Covers: HTTP endpoints, request/response validation, error handling
 * Coverage target: 85%+
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authController } from '../auth.controller';
import { authService } from '../../services/auth.service';
import { UserRole, UserStatus } from '../../types/auth';

// Mock dependencies
jest.mock('../../services/auth.service');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('should successfully register candidate', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        userType: 'candidate',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.CANDIDATE,
        status: UserStatus.ACTIVE,
      };

      (authService.register as jest.Mock).mockResolvedValue(mockUser);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          user: mockUser,
        })
      );
    });

    it('should successfully register employer', async () => {
      mockRequest.body = {
        email: 'employer@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '9876543210',
        userType: 'employer',
      };

      const mockUser = {
        id: 'user-456',
        email: 'employer@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: UserRole.EMPLOYER,
        status: UserStatus.ACTIVE,
      };

      (authService.register as jest.Mock).mockResolvedValue(mockUser);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ role: UserRole.EMPLOYER }),
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        // Missing firstName, lastName, phone, userType
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should return 400 for invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        userType: 'candidate',
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for weak password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: '123', // Too short
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        userType: 'candidate',
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 409 if email already exists', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        userType: 'candidate',
      };

      (authService.register as jest.Mock).mockRejectedValue(
        new Error('Email already registered')
      );

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('already'),
        })
      );
    });

    it('should handle service errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        userType: 'candidate',
      };

      (authService.register as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
    });
  });

  describe('login()', () => {
    it('should successfully login user', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockAuthResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: UserRole.CANDIDATE,
        },
        accessToken: 'access_token_jwt',
        refreshToken: 'refresh_token_jwt',
      };

      (authService.login as jest.Mock).mockResolvedValue(mockAuthResponse);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('logged in'),
          user: mockAuthResponse.user,
          accessToken: mockAuthResponse.accessToken,
        })
      );
    });

    it('should set refresh token in httpOnly cookie', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockAuthResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      (authService.login as jest.Mock).mockResolvedValue(mockAuthResponse);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh_token',
        expect.objectContaining({
          httpOnly: true,
          secure: expect.any(Boolean),
          sameSite: 'strict',
        })
      );
    });

    it('should return 401 for invalid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      (authService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid email or password')
      );

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 for suspended account', async () => {
      mockRequest.body = {
        email: 'suspended@example.com',
        password: 'password123',
      };

      (authService.login as jest.Mock).mockRejectedValue(
        new Error('Account is suspended')
      );

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('sendOTP()', () => {
    it('should send OTP to email', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        purpose: 'registration',
      };

      (authService.sendOTP as jest.Mock).mockResolvedValue({ otp: '123456' });

      await authController.sendOTP(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('OTP sent'),
        })
      );
    });

    it('should validate email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        purpose: 'registration',
      };

      await authController.sendOTP(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate OTP purpose', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        purpose: 'invalid_purpose',
      };

      await authController.sendOTP(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('verifyOTP()', () => {
    it('should verify OTP code successfully', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        otp: '123456',
        purpose: 'registration',
      };

      (authService.verifyOTP as jest.Mock).mockResolvedValue(true);

      await authController.verifyOTP(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('verified'),
        })
      );
    });

    it('should return 400 for invalid OTP', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        otp: '999999',
        purpose: 'registration',
      };

      (authService.verifyOTP as jest.Mock).mockRejectedValue(
        new Error('Invalid OTP')
      );

      await authController.verifyOTP(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 410 for expired OTP', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        otp: '123456',
        purpose: 'registration',
      };

      (authService.verifyOTP as jest.Mock).mockRejectedValue(
        new Error('OTP expired or not found')
      );

      await authController.verifyOTP(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(410);
    });
  });

  describe('forgotPassword()', () => {
    it('should send password reset email', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      (authService.requestPasswordReset as jest.Mock).mockResolvedValue(undefined);

      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('reset'),
        })
      );
    });

    it('should not reveal if email exists', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
      };

      (authService.requestPasswordReset as jest.Mock).mockResolvedValue(undefined);

      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      // Same message for both existing and non-existing emails
    });
  });

  describe('resetPassword()', () => {
    it('should reset password with valid token', async () => {
      mockRequest.body = {
        token: 'reset_token_jwt',
        newPassword: 'newpassword123',
      };

      (authService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('reset'),
        })
      );
    });

    it('should return 400 for invalid token', async () => {
      mockRequest.body = {
        token: 'invalid_token',
        newPassword: 'newpassword123',
      };

      (authService.resetPassword as jest.Mock).mockRejectedValue(
        new Error('Invalid token')
      );

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 410 for expired token', async () => {
      mockRequest.body = {
        token: 'expired_token',
        newPassword: 'newpassword123',
      };

      (authService.resetPassword as jest.Mock).mockRejectedValue(
        new Error('Token expired or already used')
      );

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(410);
    });
  });

  describe('refreshToken()', () => {
    it('should issue new access token', async () => {
      mockRequest.cookies = {
        refreshToken: 'refresh_token_jwt',
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue({
        accessToken: 'new_access_token',
      });

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'new_access_token',
        })
      );
    });

    it('should return 401 if refresh token missing', async () => {
      mockRequest.cookies = {};

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for invalid refresh token', async () => {
      mockRequest.cookies = {
        refreshToken: 'invalid_token',
      };

      (authService.refreshToken as jest.Mock).mockRejectedValue(
        new Error('Invalid token')
      );

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logout()', () => {
    it('should clear refresh token cookie', async () => {
      await authController.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', '', {
        httpOnly: true,
        expires: expect.any(Date),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});

describe('AuthController - Integration Tests', () => {
  describe('Complete authentication flow', () => {
    it('should handle registration and login flow', async () => {
      // Register
      mockRequest = { body: {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        userType: 'candidate',
      }};

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        role: UserRole.CANDIDATE,
      };

      (authService.register as jest.Mock).mockResolvedValueOnce(mockUser);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);

      // Login
      mockRequest.body = {
        email: 'newuser@example.com',
        password: 'password123',
      };

      mockResponse.status = jest.fn().mockReturnThis();
      mockResponse.json = jest.fn().mockReturnThis();
      mockResponse.cookie = jest.fn().mockReturnThis();

      (authService.login as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.cookie).toHaveBeenCalled();
    });
  });
});
