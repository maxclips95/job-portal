import express, { Router } from 'express';
import { employerMiddleware, authMiddleware } from '../middleware/auth.middleware';

const router: Router = express.Router();

router.get('/dashboard', employerMiddleware as any, async (req, res) => {
  res.json({ message: 'Employer dashboard' });
});

router.post('/jobs', employerMiddleware as any, async (req, res) => {
  res.json({ message: 'Post a job' });
});

export default router;
