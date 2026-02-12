import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = express.Router();

router.post('/', authMiddleware as any, async (req, res) => {
  res.json({ message: 'Apply for job' });
});

router.get('/my-applications', authMiddleware as any, async (req, res) => {
  res.json({ message: 'Get my applications' });
});

export default router;
