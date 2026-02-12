import axios, { AxiosInstance } from 'axios';
import { AuthResponse, RegisterRequest, LoginRequest, SendOTPRequest, VerifyOTPRequest, ForgotPasswordRequest, ResetPasswordRequest } from '@/types/auth';

class AuthService {
  private api: AxiosInstance;
  private apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  private baseURL = this.apiOrigin.endsWith('/api') ? this.apiOrigin : `${this.apiOrigin}/api`;

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token refresh on 401
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.api.post('/auth/refresh-token', { refreshToken });
              const { accessToken } = response.data.data;
              localStorage.setItem('accessToken', accessToken);
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Redirect to login
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post('/auth/register', data);
    return response.data.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post('/auth/login', data);
    const authData = response.data.data;
    
    // Store tokens
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('token', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);
    
    return authData;
  }

  async sendOTP(data: SendOTPRequest): Promise<void> {
    await this.api.post('/auth/send-otp', data);
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<void> {
    await this.api.post('/auth/verify-otp', data);
  }

  async otpLogin(email: string, otp: string): Promise<AuthResponse> {
    const response = await this.api.post('/auth/otp-login', { email, otp });
    const authData = response.data.data;
    
    // Store tokens
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('token', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);
    
    return authData;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await this.api.post('/auth/forgot-password', data);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await this.api.post('/auth/reset-password', data);
  }

  async logout(): Promise<void> {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    await this.api.post('/auth/logout');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const authService = new AuthService();
