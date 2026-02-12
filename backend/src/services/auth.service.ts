import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/utils/database';
import { logger } from '@/utils/logger';
import { emailService } from './email.service';
import { User, UserRole, UserStatus, JWTPayload, AuthResponse, OTPLog } from '@/types/auth';

class AuthService {
  /**
   * Register new user
   * Maps from legacy: ajax_candidateregister.php, ajax_employerregister.php
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    role: UserRole
  ): Promise<Omit<User, 'password_hash'>> {
    try {
      // Check if user exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 12);

      const query = `
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, phone, role, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, email, first_name, last_name, phone, role, status, email_verified, phone_verified, created_at, updated_at;
      `;

      const result = await db.query(query, [
        userId,
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role,
        UserStatus.ACTIVE,
      ]);

      logger.info(`User registered: ${email}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error registering user', error);
      throw error;
    }
  }

  /**
   * Login user with email and password
   * Maps from legacy: ajax_candidatelogin.php, ajax_employerlogin.php
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      if (user.status === UserStatus.SUSPENDED) {
        throw new Error('Account is suspended');
      }

      const tokens = this.generateTokens(user);

      logger.info(`User logged in: ${email}`);

      const { password_hash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error('Error logging in user', error);
      throw error;
    }
  }

  /**
   * Send OTP to email
   * Maps from legacy: sendotp.php, employsendotp.php
   */
  async sendOTP(
    email: string,
    purpose: 'registration' | 'login' | 'forgot_password' | 'email_verification'
  ): Promise<{ otp: string }> {
    try {
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const query = `
        INSERT INTO otp_logs (id, email, otp_code, purpose, attempt_count, max_attempts, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
      `;

      await db.query(query, [
        uuidv4(),
        email,
        otpCode,
        purpose,
        0,
        5,
        expiresAt,
      ]);

      // Send OTP via email
      const userType = purpose === 'registration' ? 'candidate' : 'employer';
      await emailService.sendOTPEmail(email, otpCode, userType as any);

      logger.info(`OTP sent to: ${email} for ${purpose}`);
      return { otp: otpCode }; // Only for development/testing
    } catch (error) {
      logger.error('Error sending OTP', error);
      throw error;
    }
  }

  /**
   * Verify OTP code
   * Maps from legacy: ajax_candidateotp.php, ajax_employerotp.php
   */
  async verifyOTP(
    email: string,
    otpCode: string,
    purpose: 'registration' | 'login' | 'forgot_password' | 'email_verification'
  ): Promise<boolean> {
    try {
      const query = `
        SELECT * FROM otp_logs 
        WHERE email = $1 
        AND purpose = $2 
        AND is_verified = false 
        AND attempt_count < max_attempts
        AND expires_at > NOW()
        ORDER BY created_at DESC 
        LIMIT 1;
      `;

      const result = await db.query(query, [email, purpose]);
      const otpLog = result.rows[0] as OTPLog | undefined;

      if (!otpLog) {
        throw new Error('OTP expired or not found');
      }

      if (otpLog.otp_code !== otpCode) {
        // Increment attempt count
        await db.query(
          'UPDATE otp_logs SET attempt_count = attempt_count + 1 WHERE id = $1',
          [otpLog.id]
        );
        throw new Error('Invalid OTP');
      }

      // Mark OTP as verified
      await db.query(
        'UPDATE otp_logs SET is_verified = true, verified_at = NOW() WHERE id = $1',
        [otpLog.id]
      );

      logger.info(`OTP verified for: ${email}`);
      return true;
    } catch (error) {
      logger.error('Error verifying OTP', error);
      throw error;
    }
  }

  /**
   * Request password reset
   * Maps from legacy: forgotpassword.php, employerforgot-password.php
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      const token = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' as jwt.SignOptions['expiresIn'] }
      );

      const query = `
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW());
      `;

      await db.query(query, [uuidv4(), user.id, token]);

      // Send reset email with token
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await emailService.sendPasswordResetEmail(email, token, resetUrl);

      logger.info(`Password reset token generated for: ${email}`);
    } catch (error) {
      logger.error('Error requesting password reset', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   * Maps from legacy: reset-password.php, employeruserotp.php
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token');
      }

      // Check if token is used
      const tokenQuery = `
        SELECT * FROM password_reset_tokens 
        WHERE token = $1 AND used_at IS NULL AND expires_at > NOW();
      `;
      const tokenResult = await db.query(tokenQuery, [token]);

      if (tokenResult.rows.length === 0) {
        throw new Error('Token expired or already used');
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        passwordHash,
        decoded.userId,
      ]);

      // Mark token as used
      await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [
        token,
      ]);

      logger.info(`Password reset for user: ${decoded.userId}`);
    } catch (error) {
      logger.error('Error resetting password', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as JWTPayload;

      const user = await this.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRE || '7d') as jwt.SignOptions['expiresIn'] }
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      logger.error('Error refreshing token', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1;';
      const result = await db.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user by email', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1;';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user by ID', error);
      throw error;
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET email_verified = true, email_verified_at = NOW(), updated_at = NOW() WHERE id = $1',
        [userId]
      );
      logger.info(`Email verified for user: ${userId}`);
    } catch (error) {
      logger.error('Error verifying email', error);
      throw error;
    }
  }

  /**
   * Private: Generate JWT tokens
   */
  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRE || '7d') as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: (process.env.REFRESH_TOKEN_EXPIRE || '30d') as jwt.SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  /**
   * Private: Generate random OTP
   */
  private generateOTP(): string {
    const length = parseInt(process.env.OTP_LENGTH || '6');
    return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1))
      .toString()
      .substring(0, length);
  }
}

export const authService = new AuthService();
