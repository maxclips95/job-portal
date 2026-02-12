import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = express.Router();

// Public routes
router.get('/search', async (req, res) => {
  res.json({ message: 'Job search endpoint' });
});

// Protected routes
router.get('/:id', authMiddleware as any, async (req, res) => {
  res.json({ message: 'Get job details' });
});

export default router;
