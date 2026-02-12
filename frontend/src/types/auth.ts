// Frontend Types - Auth
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'candidate' | 'employer' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  email_verified: boolean;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'candidate' | 'employer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SendOTPRequest {
  email: string;
  purpose: 'registration' | 'login' | 'forgot_password' | 'email_verification';
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
  purpose: 'registration' | 'login' | 'forgot_password' | 'email_verification';
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}
