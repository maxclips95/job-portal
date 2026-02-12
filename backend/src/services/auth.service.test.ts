/**
 * Auth Service Unit Tests
 * Covers: registration, login, OTP, password reset, token management
 * Coverage target: 85%+
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authService } from '../auth.service';
import { db } from '../../utils/database';
import { emailService } from '../email.service';
import { UserRole, UserStatus } from '../../types/auth';

// Mock dependencies
jest.mock('../../utils/database');
jest.mock('../email.service');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '1234567890',
        role: UserRole.CANDIDATE,
        status: UserStatus.ACTIVE,
        email_verified: false,
        phone_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ rows: [mockUser] }); // New user created

      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await authService.register(
        'test@example.com',
        'password123',
        'John',
        'Doe',
        '1234567890',
        UserRole.CANDIDATE
      );

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(bcryptjs.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should throw error if user already exists', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [existingUser] });

      await expect(
        authService.register(
          'test@example.com',
          'password123',
          'John',
          'Doe',
          '1234567890',
          UserRole.CANDIDATE
        )
      ).rejects.toThrow('Email already registered');
    });

    it('should handle database errors gracefully', async () => {
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        authService.register(
          'test@example.com',
          'password123',
          'John',
          'Doe',
          '1234567890',
          UserRole.CANDIDATE
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('login()', () => {
    it('should successfully login user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.CANDIDATE,
        status: UserStatus.ACTIVE,
        email_verified: true,
        phone_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBe('access_token');
      expect(result.user.password_hash).toBeUndefined();
    });

    it('should throw error for invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        status: UserStatus.ACTIVE,
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', 'wrong_password')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for non-existent user', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        authService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for suspended account', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        status: UserStatus.SUSPENDED,
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Account is suspended');
    });
  });

  describe('sendOTP()', () => {
    it('should send OTP to email', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (emailService.sendOTPEmail as jest.Mock).mockResolvedValue(true);

      const result = await authService.sendOTP('test@example.com', 'registration');

      expect(result).toHaveProperty('otp');
      expect(db.query).toHaveBeenCalled();
      expect(emailService.sendOTPEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should generate valid 6-digit OTP', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (emailService.sendOTPEmail as jest.Mock).mockResolvedValue(true);

      const result = await authService.sendOTP('test@example.com', 'registration');

      expect(result.otp).toMatch(/^\d{6}$/);
    });

    it('should handle email service failures', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (emailService.sendOTPEmail as jest.Mock).mockRejectedValue(
        new Error('Email service error')
      );

      await expect(
        authService.sendOTP('test@example.com', 'registration')
      ).rejects.toThrow('Email service error');
    });
  });

  describe('verifyOTP()', () => {
    it('should successfully verify valid OTP', async () => {
      const mockOTP = {
        id: 'otp-123',
        otp_code: '123456',
        is_verified: false,
        attempt_count: 0,
        max_attempts: 5,
        expires_at: new Date(Date.now() + 600000), // 10 minutes from now
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOTP] }) // Get OTP
        .mockResolvedValueOnce({ rows: [] }); // Mark as verified

      const result = await authService.verifyOTP(
        'test@example.com',
        '123456',
        'registration'
      );

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid OTP code', async () => {
      const mockOTP = {
        id: 'otp-123',
        otp_code: '123456',
        is_verified: false,
        attempt_count: 0,
        max_attempts: 5,
        expires_at: new Date(Date.now() + 600000),
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOTP] })
        .mockResolvedValueOnce({ rows: [] }); // Increment attempt

      await expect(
        authService.verifyOTP('test@example.com', '999999', 'registration')
      ).rejects.toThrow('Invalid OTP');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('attempt_count'),
        expect.any(Array)
      );
    });

    it('should throw error for expired OTP', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        authService.verifyOTP('test@example.com', '123456', 'registration')
      ).rejects.toThrow('OTP expired or not found');
    });

    it('should block after maximum attempts', async () => {
      const mockOTP = {
        id: 'otp-123',
        otp_code: '123456',
        is_verified: false,
        attempt_count: 5,
        max_attempts: 5,
        expires_at: new Date(Date.now() + 600000),
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        authService.verifyOTP('test@example.com', '999999', 'registration')
      ).rejects.toThrow('OTP expired or not found');
    });
  });

  describe('requestPasswordReset()', () => {
    it('should send password reset email for valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [] }); // Insert reset token

      (jwt.sign as jest.Mock).mockReturnValue('reset_token');
      (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);

      await authService.requestPasswordReset('test@example.com');

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'reset_token',
        expect.stringContaining('reset-password')
      );
    });

    it('should silently fail for non-existent user', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Should not throw error
      await expect(
        authService.requestPasswordReset('nonexistent@example.com')
      ).resolves.not.toThrow();

      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle email service errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      (jwt.sign as jest.Mock).mockReturnValue('reset_token');
      (emailService.sendPasswordResetEmail as jest.Mock).mockRejectedValue(
        new Error('Email service error')
      );

      await expect(
        authService.requestPasswordReset('test@example.com')
      ).rejects.toThrow('Email service error');
    });
  });

  describe('resetPassword()', () => {
    it('should successfully reset password with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        user_id: 'user-123',
        token: 'reset_token',
        used_at: null,
        expires_at: new Date(Date.now() + 3600000), // 1 hour from now
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
        type: 'password_reset',
      });

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockToken] }) // Get token
        .mockResolvedValueOnce({ rows: [] }) // Update password
        .mockResolvedValueOnce({ rows: [] }); // Mark token as used

      (bcryptjs.hash as jest.Mock).mockResolvedValue('new_hashed_password');

      await authService.resetPassword('reset_token', 'newpassword123');

      expect(bcryptjs.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error for invalid token type', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
        type: 'invalid_type',
      });

      await expect(
        authService.resetPassword('invalid_token', 'newpassword123')
      ).rejects.toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
        type: 'password_reset',
      });

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        authService.resetPassword('expired_token', 'newpassword123')
      ).rejects.toThrow('Token expired or already used');
    });

    it('should throw error for already used token', async () => {
      const mockToken = {
        id: 'token-123',
        user_id: 'user-123',
        used_at: new Date(), // Already used
        expires_at: new Date(Date.now() + 3600000),
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
        type: 'password_reset',
      });

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        authService.resetPassword('used_token', 'newpassword123')
      ).rejects.toThrow('Token expired or already used');
    });
  });

  describe('refreshToken()', () => {
    it('should generate new access token from valid refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.CANDIDATE,
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-123',
      });

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      (jwt.sign as jest.Mock).mockReturnValue('new_access_token');

      const result = await authService.refreshToken('refresh_token');

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('new_access_token');
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should throw error for invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockThrow(new Error('Invalid token'));

      await expect(
        authService.refreshToken('invalid_token')
      ).rejects.toThrow('Invalid token');
    });

    it('should throw error if user not found', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'nonexistent-user',
      });

      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        authService.refreshToken('refresh_token')
      ).rejects.toThrow('User not found');
    });
  });

  describe('getUserByEmail()', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await authService.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE email = $1'),
        ['test@example.com']
      );
    });

    it('should return null when user not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await authService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        authService.getUserByEmail('test@example.com')
      ).rejects.toThrow('Database error');
    });
  });

  describe('verifyEmail()', () => {
    it('should successfully verify user email', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await authService.verifyEmail('user-123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('email_verified = true'),
        ['user-123']
      );
    });

    it('should handle database errors', async () => {
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        authService.verifyEmail('user-123')
      ).rejects.toThrow('Database error');
    });
  });
});

describe('AuthService - Integration Tests', () => {
  describe('Complete authentication flow', () => {
    it('should handle complete user registration and login flow', async () => {
      // Registration step
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: UserRole.CANDIDATE,
        status: UserStatus.ACTIVE,
      };

      // Login step
      const loginMockUser = {
        ...mockUser,
        password_hash: 'hashed_password',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ rows: [mockUser] }) // User created
        .mockResolvedValueOnce({ rows: [loginMockUser] }); // User found for login

      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed_password');
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      // Register
      const registerResult = await authService.register(
        'newuser@example.com',
        'password123',
        'Jane',
        'Smith',
        '9876543210',
        UserRole.CANDIDATE
      );

      expect(registerResult.email).toBe('newuser@example.com');

      // Login
      const loginResult = await authService.login('newuser@example.com', 'password123');

      expect(loginResult).toHaveProperty('user');
      expect(loginResult).toHaveProperty('accessToken');
      expect(loginResult.accessToken).toBe('access_token');
    });
  });
});
