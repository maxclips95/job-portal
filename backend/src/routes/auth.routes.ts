import express, { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimit, otpRateLimit } from '@/middleware/security';

const router: Router = express.Router();

router.post('/register', authRateLimit, AuthController.register);
router.post('/login', authRateLimit, AuthController.login);
router.post('/send-otp', otpRateLimit, AuthController.sendOTP);
router.post('/verify-otp', otpRateLimit, AuthController.verifyOTP);
router.post('/otp-login', otpRateLimit, AuthController.otpLogin);
router.post('/forgot-password', authRateLimit, AuthController.forgotPassword);
router.post('/reset-password', authRateLimit, AuthController.resetPassword);
router.post('/refresh-token', authRateLimit, AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;
