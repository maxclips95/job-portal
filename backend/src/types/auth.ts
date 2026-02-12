// Auth Types
export enum UserRole {
  CANDIDATE = 'candidate',
  EMPLOYER = 'employer',
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  email_verified_at: Date | null;
  phone_verified: boolean;
  phone_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OTPLog {
  id: string;
  email: string;
  otp_code: string;
  purpose: 'registration' | 'login' | 'forgot_password' | 'email_verification';
  is_verified: boolean;
  verified_at: Date | null;
  attempt_count: number;
  max_attempts: number;
  expires_at: Date;
  created_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
}
