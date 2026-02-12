'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const [roleHint, setRoleHint] = useState<'candidate' | 'employer' | 'admin'>(
    'candidate'
  );
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const { setAuth } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const role = new URLSearchParams(window.location.search).get('role');
    if (role === 'employer' || role === 'admin' || role === 'candidate') {
      setRoleHint(role);
    }
  }, []);

  const routeByRole = (role: 'candidate' | 'employer' | 'admin') => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'employer') return '/employer/jobs';
    return '/candidate/applications';
  };

  const roleLabel = roleHint === 'employer' ? 'Employer' : roleHint === 'admin' ? 'Admin' : 'Candidate';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.sendOTP({
        email: formData.email,
        purpose: 'login',
      });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authService.otpLogin(formData.email, otp);
      if (response.user.role !== roleHint) {
        setError(`This account is ${response.user.role}. Please use ${response.user.role} login.`);
        setLoading(false);
        return;
      }
      setAuth(response);
      router.push(routeByRole(response.user.role));
    } catch (err: any) {
      setError(err.message || 'OTP login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });
      if (response.user.role !== roleHint) {
        setError(`This account is ${response.user.role}. Please use ${response.user.role} login.`);
        setLoading(false);
        return;
      }
      setAuth(response);
      router.push(routeByRole(response.user.role));
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{roleLabel} Login</h1>
        <p className="text-gray-600 mb-4">Sign in to continue to {roleLabel.toLowerCase()} workspace</p>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {(['candidate', 'employer', 'admin'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleHint(role)}
              className={`px-3 py-2 rounded text-sm font-medium capitalize ${
                roleHint === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Login Method Toggle */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('password');
              setOtpSent(false);
              setOtp('');
            }}
            className={`flex-1 py-2 px-4 rounded font-medium transition ${
              loginMethod === 'password'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('otp')}
            className={`flex-1 py-2 px-4 rounded font-medium transition ${
              loginMethod === 'otp'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            OTP
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Password Login Form */}
        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* OTP Login Form */}
        {loginMethod === 'otp' && (
          <>
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOTPLogin} className="space-y-4">
                <p className="text-gray-600">OTP sent to {formData.email}</p>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">OTP Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                  className="w-full text-blue-600 hover:underline font-medium"
                >
                  Change Email
                </button>
              </form>
            )}
          </>
        )}

        {/* Links */}
        <div className="mt-6 space-y-2 text-center">
          <div>
            <Link href="/auth/forgot-password" className="text-blue-600 hover:underline text-sm">
              Forgot password?
            </Link>
          </div>
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
