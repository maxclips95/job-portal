import apiClient from './api';

export const authService = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post('/auth/login', data),
  verifyOTP: (data: any) => apiClient.post('/auth/verify-otp', data),
  resendOTP: (email: string) => apiClient.post('/auth/resend-otp', { email }),
};
