import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = express.Router();

router.get('/profile', authMiddleware as any, async (req, res) => {
  res.json({ message: 'Get user profile' });
});

router.put('/profile', authMiddleware as any, async (req, res) => {
  res.json({ message: 'Update user profile' });
});

export default router;
