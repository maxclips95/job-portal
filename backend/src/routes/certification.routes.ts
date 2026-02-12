import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '@/utils/database';
import { authenticateToken } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
    role?: string;
  };
};

const getUserId = (req: AuthenticatedRequest): string | null => req.user?.userId || null;

const assertSelfOrAdmin = (req: AuthenticatedRequest, requestedUserId: string): boolean => {
  const authUserId = getUserId(req);
  const role = req.user?.role;
  if (!authUserId) return false;
  if (requestedUserId === 'me') return true;
  return authUserId === requestedUserId || role === 'admin';
};

const normalizeSkillName = (skillId: string): string => {
  const lookup: Record<string, string> = {
    react: 'React',
    typescript: 'TypeScript',
    nodejs: 'Node.js',
    python: 'Python',
    leadership: 'Leadership',
    communication: 'Communication',
  };
  return lookup[skillId] || skillId;
};

const calcLevelFromScore = (score: number): string => {
  if (score >= 90) return 'master';
  if (score >= 80) return 'expert';
  if (score >= 70) return 'professional';
  return 'foundational';
};

router.use(authenticateToken);

router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    await db.query(
      `
        INSERT INTO certification_portfolios_runtime (id, user_id, title, bio)
        VALUES ($1, $2, 'My Portfolio', '')
        ON CONFLICT (user_id) DO NOTHING
      `,
      [randomUUID(), userId]
    );

    const [assessments, certifications, portfolioResult, portfolioItems, badges, endorsements] =
      await Promise.all([
        db.query(
          `SELECT id, skill_id, title, description, difficulty, duration_minutes, passing_score
           FROM certification_assessments_runtime
           WHERE status IN ('published', 'active')
           ORDER BY created_at DESC`
        ),
        db.query(
          `SELECT id, skill_id, level, earned_date, expiry_date, status, credential_url, verification_token
           FROM certification_certifications_runtime
           WHERE user_id = $1
           ORDER BY earned_date DESC`,
          [userId]
        ),
        db.query(
          `SELECT id, title, bio, is_published
           FROM certification_portfolios_runtime
           WHERE user_id = $1
           LIMIT 1`,
          [userId]
        ),
        db.query(
          `
            SELECT i.id, i.item_type, i.title, i.description, i.skills, i.links
            FROM certification_portfolio_items_runtime i
            INNER JOIN certification_portfolios_runtime p ON p.id = i.portfolio_id
            WHERE p.user_id = $1
            ORDER BY i.created_at DESC
          `,
          [userId]
        ),
        db.query(
          `SELECT id, skill_id, skill_name, name, description, icon, color, level
           FROM certification_badges_runtime
           ORDER BY name ASC`
        ),
        db.query(
          `
            SELECT e.id, e.skill_id, e.skill_name, e.level, e.message, e.endorsement_date,
                   u.first_name, u.last_name
            FROM certification_endorsements_runtime e
            LEFT JOIN users u ON u.id = e.endorsed_by_user_id
            WHERE e.endorsed_user_id = $1
            ORDER BY e.endorsement_date DESC
          `,
          [userId]
        ),
      ]);

    const portfolio = portfolioResult.rows[0] || {
      id: null,
      title: 'My Portfolio',
      bio: '',
      is_published: false,
    };

    const earnedSkillIds = new Set(certifications.rows.map((row: any) => row.skill_id));
    const trustScore = Math.min(
      100,
      certifications.rows.length * 15 + endorsements.rows.length * 7
    );

    res.json({
      assessments: assessments.rows.map((row: any) => ({
        id: row.id,
        skillId: row.skill_id,
        name: row.title,
        description: row.description,
        difficulty: row.difficulty,
        duration: Number(row.duration_minutes),
        passingScore: Number(row.passing_score),
      })),
      certifications: certifications.rows.map((row: any) => ({
        id: row.id,
        skillId: row.skill_id,
        level: row.level,
        earnedDate: row.earned_date,
        expiryDate: row.expiry_date,
        credentialUrl: row.credential_url,
        status: row.status,
        verificationToken: row.verification_token,
      })),
      portfolio: {
        id: portfolio.id,
        title: portfolio.title,
        bio: portfolio.bio,
        published: Boolean(portfolio.is_published),
        items: portfolioItems.rows.map((row: any) => ({
          id: row.id,
          type: row.item_type,
          title: row.title,
          description: row.description,
          skills: Array.isArray(row.skills) ? row.skills : [],
          links: row.links || {},
        })),
      },
      badges: badges.rows.map((row: any) => ({
        id: row.id,
        skillId: row.skill_id,
        skillName: row.skill_name,
        name: row.name,
        description: row.description,
        icon: row.icon,
        color: row.color,
        level: row.level,
      })),
      earnedBadgeIds: badges.rows
        .filter((row: any) => earnedSkillIds.has(row.skill_id))
        .map((row: any) => row.id),
      endorsements: endorsements.rows.map((row: any) => ({
        id: row.id,
        skillId: row.skill_id,
        skillName: row.skill_name,
        endorsedBy: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Member',
        level: row.level,
        message: row.message || undefined,
        endorsementDate: row.endorsement_date,
      })),
      trustScore,
      totalEndorsements: endorsements.rows.length,
    });
  } catch (error) {
    logger.error('Failed to load certification overview', error);
    res.status(500).json({ message: 'Failed to load certification overview' });
  }
});

router.post('/assessments/:assessmentId/start', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const assessmentResult = await db.query(
      `
        SELECT id, title, description, duration_minutes
        FROM certification_assessments_runtime
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.assessmentId]
    );

    if (assessmentResult.rows.length === 0) {
      res.status(404).json({ message: 'Assessment not found' });
      return;
    }

    const questionResult = await db.query(
      `
        SELECT id, question_type, content, options, points
        FROM certification_questions_runtime
        WHERE assessment_id = $1
        ORDER BY position ASC
      `,
      [req.params.assessmentId]
    );

    const attemptId = randomUUID();
    await db.query(
      `
        INSERT INTO certification_attempts_runtime (id, assessment_id, user_id, status)
        VALUES ($1, $2, $3, 'in-progress')
      `,
      [attemptId, req.params.assessmentId, userId]
    );

    res.status(201).json({
      attemptId,
      assessmentId: req.params.assessmentId,
      durationMinutes: Number(assessmentResult.rows[0].duration_minutes),
      questions: questionResult.rows.map((row: any) => ({
        id: row.id,
        type: row.question_type,
        content: row.content,
        options: Array.isArray(row.options) ? row.options : [],
        points: Number(row.points),
      })),
    });
  } catch (error) {
    logger.error('Failed to start assessment', error);
    res.status(500).json({ message: 'Failed to start assessment' });
  }
});

router.post('/assessments/attempts/:attemptId/submit', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const answers = (req.body?.answers || {}) as Record<string, string>;

  try {
    const attemptResult = await db.query(
      `
        SELECT a.id, a.assessment_id, a.status, s.skill_id, s.passing_score
        FROM certification_attempts_runtime a
        INNER JOIN certification_assessments_runtime s ON s.id = a.assessment_id
        WHERE a.id = $1 AND a.user_id = $2
        LIMIT 1
      `,
      [req.params.attemptId, userId]
    );

    if (attemptResult.rows.length === 0) {
      res.status(404).json({ message: 'Attempt not found' });
      return;
    }

    const attempt = attemptResult.rows[0];
    if (attempt.status === 'completed') {
      res.status(400).json({ message: 'Attempt already submitted' });
      return;
    }

    const questionResult = await db.query(
      `
        SELECT id, correct_answer, points
        FROM certification_questions_runtime
        WHERE assessment_id = $1
      `,
      [attempt.assessment_id]
    );

    const totalPoints = questionResult.rows.reduce(
      (sum: number, row: any) => sum + Number(row.points || 0),
      0
    );

    const earnedPoints = questionResult.rows.reduce((sum: number, row: any) => {
      const given = (answers[row.id] || '').trim().toLowerCase();
      const expected = String(row.correct_answer || '').trim().toLowerCase();
      return sum + (given === expected ? Number(row.points || 0) : 0);
    }, 0);

    const score = totalPoints > 0 ? Number(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0;
    const isPassed = score >= Number(attempt.passing_score || 70);

    await db.query(
      `
        UPDATE certification_attempts_runtime
        SET status = 'completed',
            score = $1,
            is_passed = $2,
            answers = $3::jsonb,
            submitted_at = NOW()
        WHERE id = $4
      `,
      [score, isPassed, JSON.stringify(answers), req.params.attemptId]
    );

    if (isPassed) {
      const verificationToken = randomUUID().replace(/-/g, '');
      const credentialUrl = `http://localhost:3000/certification/verify/${verificationToken}`;
      const level = calcLevelFromScore(score);

      await db.query(
        `
          INSERT INTO certification_certifications_runtime (
            id, user_id, skill_id, level, earned_date, expiry_date, status, verification_token, credential_url
          ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '2 years', 'earned', $5, $6)
          ON CONFLICT (user_id, skill_id)
          DO UPDATE SET
            level = EXCLUDED.level,
            earned_date = EXCLUDED.earned_date,
            expiry_date = EXCLUDED.expiry_date,
            status = 'earned',
            verification_token = EXCLUDED.verification_token,
            credential_url = EXCLUDED.credential_url
        `,
        [randomUUID(), userId, attempt.skill_id, level, verificationToken, credentialUrl]
      );
    }

    res.json({
      attemptId: req.params.attemptId,
      score,
      isPassed,
      passingScore: Number(attempt.passing_score || 70),
      feedback: isPassed ? 'Great work. Certification earned.' : 'Did not meet passing score yet.',
      recommendations: isPassed
        ? ['Add this credential to your profile.']
        : ['Review weak areas and retake assessment.'],
    });
  } catch (error) {
    logger.error('Failed to submit assessment', error);
    res.status(500).json({ message: 'Failed to submit assessment' });
  }
});

router.get('/users/:userId/certifications', async (req: AuthenticatedRequest, res: Response) => {
  if (!assertSelfOrAdmin(req, req.params.userId)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const userId = req.params.userId === 'me' ? getUserId(req)! : req.params.userId;

  try {
    const result = await db.query(
      `
        SELECT id, skill_id, level, earned_date, expiry_date, status, credential_url, verification_token
        FROM certification_certifications_runtime
        WHERE user_id = $1
        ORDER BY earned_date DESC
      `,
      [userId]
    );
    res.json(
      result.rows.map((row: any) => ({
        id: row.id,
        skillId: row.skill_id,
        level: row.level,
        earnedDate: row.earned_date,
        expiryDate: row.expiry_date,
        status: row.status,
        credentialUrl: row.credential_url,
        verificationToken: row.verification_token,
      }))
    );
  } catch (error) {
    logger.error('Failed to fetch certifications', error);
    res.status(500).json({ message: 'Failed to fetch certifications' });
  }
});

router.get('/certifications/verify/:token', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await db.query(
      `
        SELECT id, skill_id, level, status, expiry_date
        FROM certification_certifications_runtime
        WHERE verification_token = $1
        LIMIT 1
      `,
      [req.params.token]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ isValid: false, message: 'Certification not found' });
      return;
    }

    const cert = result.rows[0];
    const isExpired = cert.expiry_date ? new Date(cert.expiry_date) < new Date() : false;
    const isValid = cert.status === 'earned' && !isExpired;

    res.json({
      isValid,
      certification: {
        id: cert.id,
        skillId: cert.skill_id,
        level: cert.level,
        status: cert.status,
        expiryDate: cert.expiry_date,
      },
    });
  } catch (error) {
    logger.error('Failed to verify certification token', error);
    res.status(500).json({ isValid: false, message: 'Failed to verify certification' });
  }
});

router.post('/certifications/:certId/share', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const result = await db.query(
      `
        SELECT verification_token, user_id
        FROM certification_certifications_runtime
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.certId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Certification not found' });
      return;
    }

    if (result.rows[0].user_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const token = result.rows[0].verification_token;
    res.json({
      token,
      shareUrl: `http://localhost:3000/certification/verify/${token}`,
    });
  } catch (error) {
    logger.error('Failed to create share link', error);
    res.status(500).json({ message: 'Failed to create share link' });
  }
});

router.get('/users/:userId/portfolio', async (req: AuthenticatedRequest, res: Response) => {
  if (!assertSelfOrAdmin(req, req.params.userId)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const userId = req.params.userId === 'me' ? getUserId(req)! : req.params.userId;

  try {
    await db.query(
      `
        INSERT INTO certification_portfolios_runtime (id, user_id, title, bio)
        VALUES ($1, $2, 'My Portfolio', '')
        ON CONFLICT (user_id) DO NOTHING
      `,
      [randomUUID(), userId]
    );

    const portfolioResult = await db.query(
      `
        SELECT id, title, bio, is_published
        FROM certification_portfolios_runtime
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );

    const portfolio = portfolioResult.rows[0];
    const itemsResult = await db.query(
      `
        SELECT id, item_type, title, description, skills, links
        FROM certification_portfolio_items_runtime
        WHERE portfolio_id = $1
        ORDER BY created_at DESC
      `,
      [portfolio.id]
    );

    res.json({
      id: portfolio.id,
      title: portfolio.title,
      bio: portfolio.bio,
      published: Boolean(portfolio.is_published),
      items: itemsResult.rows.map((row: any) => ({
        id: row.id,
        type: row.item_type,
        title: row.title,
        description: row.description,
        skills: Array.isArray(row.skills) ? row.skills : [],
        links: row.links || {},
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch portfolio', error);
    res.status(500).json({ message: 'Failed to fetch portfolio' });
  }
});

router.put('/users/:userId/portfolio', async (req: AuthenticatedRequest, res: Response) => {
  if (!assertSelfOrAdmin(req, req.params.userId)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const userId = req.params.userId === 'me' ? getUserId(req)! : req.params.userId;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const bio = typeof req.body?.bio === 'string' ? req.body.bio.trim() : '';

  if (!title) {
    res.status(400).json({ message: 'title is required' });
    return;
  }

  try {
    const result = await db.query(
      `
        INSERT INTO certification_portfolios_runtime (id, user_id, title, bio, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET title = EXCLUDED.title, bio = EXCLUDED.bio, updated_at = NOW()
        RETURNING id, title, bio, is_published
      `,
      [randomUUID(), userId, title, bio]
    );

    res.json({
      id: result.rows[0].id,
      title: result.rows[0].title,
      bio: result.rows[0].bio,
      published: Boolean(result.rows[0].is_published),
    });
  } catch (error) {
    logger.error('Failed to update portfolio', error);
    res.status(500).json({ message: 'Failed to update portfolio' });
  }
});

router.post('/portfolios/:portfolioId/publish', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const ownership = await db.query(
      'SELECT id FROM certification_portfolios_runtime WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.portfolioId, userId]
    );

    if (ownership.rows.length === 0 && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const result = await db.query(
      `
        UPDATE certification_portfolios_runtime
        SET is_published = TRUE, updated_at = NOW()
        WHERE id = $1
        RETURNING id, title, bio, is_published
      `,
      [req.params.portfolioId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Portfolio not found' });
      return;
    }

    res.json({
      id: result.rows[0].id,
      title: result.rows[0].title,
      bio: result.rows[0].bio,
      published: Boolean(result.rows[0].is_published),
    });
  } catch (error) {
    logger.error('Failed to publish portfolio', error);
    res.status(500).json({ message: 'Failed to publish portfolio' });
  }
});

router.post('/portfolios/:portfolioId/items', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const itemType = typeof req.body?.type === 'string' ? req.body.type.trim() : 'project';
  const skills = Array.isArray(req.body?.skills) ? req.body.skills.filter(Boolean) : [];
  const links = req.body?.links && typeof req.body.links === 'object' ? req.body.links : {};

  if (!title || !description) {
    res.status(400).json({ message: 'title and description are required' });
    return;
  }

  try {
    const ownership = await db.query(
      'SELECT id FROM certification_portfolios_runtime WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.portfolioId, userId]
    );
    if (ownership.rows.length === 0 && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const result = await db.query(
      `
        INSERT INTO certification_portfolio_items_runtime (
          id, portfolio_id, item_type, title, description, skills, links
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        RETURNING id, item_type, title, description, skills, links
      `,
      [randomUUID(), req.params.portfolioId, itemType, title, description, JSON.stringify(skills), JSON.stringify(links)]
    );

    res.status(201).json({
      id: result.rows[0].id,
      type: result.rows[0].item_type,
      title: result.rows[0].title,
      description: result.rows[0].description,
      skills: result.rows[0].skills || [],
      links: result.rows[0].links || {},
    });
  } catch (error) {
    logger.error('Failed to add portfolio item', error);
    res.status(500).json({ message: 'Failed to add portfolio item' });
  }
});

router.delete('/portfolios/:portfolioId/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const ownership = await db.query(
      'SELECT id FROM certification_portfolios_runtime WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.portfolioId, userId]
    );
    if (ownership.rows.length === 0 && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const result = await db.query(
      `
        DELETE FROM certification_portfolio_items_runtime
        WHERE id = $1 AND portfolio_id = $2
        RETURNING id
      `,
      [req.params.itemId, req.params.portfolioId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Portfolio item not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete portfolio item', error);
    res.status(500).json({ message: 'Failed to delete portfolio item' });
  }
});

router.get('/badges/:badgeId/progress', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const badgeResult = await db.query(
      `
        SELECT id, skill_id
        FROM certification_badges_runtime
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.badgeId]
    );
    if (badgeResult.rows.length === 0) {
      res.status(404).json({ message: 'Badge not found' });
      return;
    }
    const badge = badgeResult.rows[0];

    const [certs, endorsements, projects] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS count
         FROM certification_certifications_runtime
         WHERE user_id = $1 AND skill_id = $2 AND status = 'earned'`,
        [userId, badge.skill_id]
      ),
      db.query(
        `SELECT COUNT(*)::int AS count
         FROM certification_endorsements_runtime
         WHERE endorsed_user_id = $1 AND skill_id = $2`,
        [userId, badge.skill_id]
      ),
      db.query(
        `
          SELECT COUNT(*)::int AS count
          FROM certification_portfolio_items_runtime i
          INNER JOIN certification_portfolios_runtime p ON p.id = i.portfolio_id
          WHERE p.user_id = $1 AND i.skills ? $2
        `,
        [userId, badge.skill_id]
      ),
    ]);

    const assessmentScore = Number(certs.rows[0]?.count || 0) > 0 ? 100 : 0;
    const projectCount = Number(projects.rows[0]?.count || 0);
    const endorsementCount = Number(endorsements.rows[0]?.count || 0);
    const overall = Math.min(
      100,
      Math.round(assessmentScore * 0.5 + Math.min(100, projectCount * 50) * 0.25 + Math.min(100, endorsementCount * 25) * 0.25)
    );

    res.json({
      overall,
      details: {
        overallProgress: overall,
        assessmentScore: {
          current: assessmentScore,
          required: 100,
          percentage: assessmentScore,
        },
        practicalProjects: {
          current: projectCount,
          required: 2,
        },
        endorsements: {
          current: endorsementCount,
          required: 4,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to compute badge progress', error);
    res.status(500).json({ message: 'Failed to compute badge progress' });
  }
});

router.post('/users/:userId/skills/:skillId/endorse', async (req: AuthenticatedRequest, res: Response) => {
  const authorId = getUserId(req);
  if (!authorId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!assertSelfOrAdmin(req, req.params.userId)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const targetUserId = req.params.userId === 'me' ? authorId : req.params.userId;
  const skillId = req.params.skillId;
  const skillName = normalizeSkillName(skillId);
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const level = typeof req.body?.level === 'string' ? req.body.level : 'intermediate';

  try {
    const result = await db.query(
      `
        INSERT INTO certification_endorsements_runtime (
          id, endorsed_user_id, endorsed_by_user_id, skill_id, skill_name, level, message, endorsement_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `,
      [randomUUID(), targetUserId, authorId, skillId, skillName, level, message || null]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    logger.error('Failed to add endorsement', error);
    res.status(500).json({ message: 'Failed to add endorsement' });
  }
});

router.delete('/endorsements/:endorsementId', async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const result = await db.query(
      `
        DELETE FROM certification_endorsements_runtime
        WHERE id = $1 AND (endorsed_user_id = $2 OR endorsed_by_user_id = $2 OR $3 = 'admin')
        RETURNING id
      `,
      [req.params.endorsementId, userId, req.user?.role || 'candidate']
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Endorsement not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to remove endorsement', error);
    res.status(500).json({ message: 'Failed to remove endorsement' });
  }
});

export default router;
