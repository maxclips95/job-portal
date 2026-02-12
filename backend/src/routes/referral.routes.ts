import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '@/utils/database';
import { logger } from '@/utils/logger';

const router = Router();

let tablesReadyPromise: Promise<void> | null = null;

const nowIso = () => new Date().toISOString();
const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const getUserContext = (req: Request) => {
  const user = req.user as any;
  return {
    id: user?.userId || user?.id || 'guest-user',
    name:
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.name ||
      'You',
    level: user?.level || 'silver',
  };
};

const ensureRuntimeTables = async (): Promise<void> => {
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_referrals_runtime (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL,
          referral_code TEXT NOT NULL UNIQUE,
          referral_link TEXT NOT NULL,
          source TEXT,
          campaign TEXT,
          status VARCHAR(20) NOT NULL,
          shares INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL,
          accepted_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ NOT NULL
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_rewards_runtime (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL,
          referral_id UUID,
          reward_type TEXT NOT NULL,
          amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          currency VARCHAR(8) NOT NULL DEFAULT 'USD',
          status VARCHAR(20) NOT NULL,
          earned_at TIMESTAMPTZ NOT NULL,
          redeemed_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          description TEXT
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_payment_methods_runtime (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL,
          method TEXT NOT NULL,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          is_verified BOOLEAN NOT NULL DEFAULT FALSE,
          is_primary BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_payouts_runtime (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL,
          amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          currency VARCHAR(8) NOT NULL DEFAULT 'USD',
          status VARCHAR(20) NOT NULL,
          frequency TEXT NOT NULL,
          payment_method_id UUID,
          requested_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_posts_runtime (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          user_level TEXT NOT NULL DEFAULT 'silver',
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          tags JSONB NOT NULL DEFAULT '[]'::jsonb,
          likes INTEGER NOT NULL DEFAULT 0,
          comments INTEGER NOT NULL DEFAULT 0,
          shares INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_post_likes_runtime (
          id UUID PRIMARY KEY,
          post_id UUID NOT NULL REFERENCES referral_posts_runtime(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE(post_id, user_id)
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_comments_runtime (
          id UUID PRIMARY KEY,
          post_id UUID NOT NULL REFERENCES referral_posts_runtime(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          content TEXT NOT NULL,
          likes INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS referral_contributions_runtime (
          id UUID PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          points INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);

      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_referral_referrals_runtime_user ON referral_referrals_runtime(user_id);'
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_referral_rewards_runtime_user ON referral_rewards_runtime(user_id);'
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_referral_payment_methods_runtime_user ON referral_payment_methods_runtime(user_id);'
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_referral_payouts_runtime_user ON referral_payouts_runtime(user_id);'
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_referral_posts_runtime_created ON referral_posts_runtime(created_at DESC);'
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_referral_comments_runtime_post ON referral_comments_runtime(post_id);'
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_referral_contributions_runtime_user ON referral_contributions_runtime(user_id);'
      );
    })();
  }

  await tablesReadyPromise;
};

router.use(async (_req, _res, next) => {
  try {
    await ensureRuntimeTables();
    next();
  } catch (error) {
    next(error);
  }
});

router.post('/invite', (req: Request, res: Response) => {
  const { email, subject, message } = req.body || {};
  res.json({
    success: true,
    email,
    subject: subject || 'Join Job Portal',
    message: message || '',
    queuedAt: nowIso(),
  });
});

router.post('/create', async (req: Request, res: Response) => {
  const user = getUserContext(req);
  const code = makeCode();
  const id = randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  const referralLink = `http://localhost:3000/auth/register?ref=${code}`;

  try {
    await db.query(
      `
        INSERT INTO referral_referrals_runtime (
          id, user_id, referral_code, referral_link, source, campaign, status, shares, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 0, $7::timestamptz, $8::timestamptz)
      `,
      [
        id,
        user.id,
        code,
        referralLink,
        req.body?.source || null,
        req.body?.campaign || null,
        createdAt,
        expiresAt,
      ]
    );

    res.status(201).json({
      id,
      referral_code: code,
      referral_link: referralLink,
      source: req.body?.source,
      campaign: req.body?.campaign,
      status: 'active',
      created_at: createdAt,
      expires_at: expiresAt,
      shares: 0,
    });
  } catch (error) {
    logger.error('Failed to create referral', error);
    res.status(500).json({ message: 'Failed to create referral' });
  }
});

router.get('/list', async (req: Request, res: Response) => {
  const user = getUserContext(req);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;

  try {
    const result = status
      ? await db.query(
          `
            SELECT * FROM referral_referrals_runtime
            WHERE user_id = $1 AND status = $2
            ORDER BY created_at DESC
          `,
          [user.id, status]
        )
      : await db.query(
          `
            SELECT * FROM referral_referrals_runtime
            WHERE user_id = $1
            ORDER BY created_at DESC
          `,
          [user.id]
        );

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to list referrals', error);
    res.status(500).json({ message: 'Failed to list referrals' });
  }
});

router.post('/accept', async (req: Request, res: Response) => {
  const { referralCode } = req.body || {};

  if (!referralCode || typeof referralCode !== 'string') {
    res.status(400).json({ message: 'referralCode is required' });
    return;
  }

  try {
    const referralResult = await db.query(
      `
        UPDATE referral_referrals_runtime
        SET status = 'completed', accepted_at = NOW()
        WHERE referral_code = $1
        RETURNING *
      `,
      [referralCode]
    );

    if (referralResult.rows.length === 0) {
      res.status(404).json({ message: 'Referral not found' });
      return;
    }

    const referral = referralResult.rows[0];
    await db.query(
      `
        INSERT INTO referral_rewards_runtime (
          id, user_id, referral_id, reward_type, amount, currency, status, earned_at, description
        ) VALUES ($1, $2, $3, 'credit', $4, 'USD', 'earned', NOW(), $5)
      `,
      [randomUUID(), referral.user_id, referral.id, 5, 'Referral conversion reward']
    );

    res.json({ success: true, status: 'accepted' });
  } catch (error) {
    logger.error('Failed to accept referral', error);
    res.status(500).json({ message: 'Failed to accept referral' });
  }
});

router.post('/:id/share', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        UPDATE referral_referrals_runtime
        SET shares = shares + 1
        WHERE id = $1 AND user_id = $2
        RETURNING shares
      `,
      [req.params.id, user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Referral not found' });
      return;
    }

    res.json({
      success: true,
      shares: Number(result.rows[0].shares),
      platform: req.body?.platform || 'link',
    });
  } catch (error) {
    logger.error('Failed to share referral', error);
    res.status(500).json({ message: 'Failed to share referral' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        SELECT status, COUNT(*)::int AS count
        FROM referral_referrals_runtime
        WHERE user_id = $1
        GROUP BY status
      `,
      [user.id]
    );

    const stats = {
      pending: 0,
      active: 0,
      completed: 0,
      expired: 0,
    };

    for (const row of result.rows) {
      if (row.status in stats) {
        (stats as any)[row.status] = Number(row.count);
      }
    }

    res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch referral stats', error);
    res.status(500).json({ message: 'Failed to fetch referral stats' });
  }
});

router.get('/rewards', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        SELECT *
        FROM referral_rewards_runtime
        WHERE user_id = $1
        ORDER BY earned_at DESC
      `,
      [user.id]
    );

    res.json(result.rows.map((row: any) => ({ ...row, amount: Number(row.amount) })));
  } catch (error) {
    logger.error('Failed to fetch rewards', error);
    res.status(500).json({ message: 'Failed to fetch rewards' });
  }
});

router.post('/rewards/:rewardId/redeem', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const rewardResult = await db.query(
      `
        SELECT * FROM referral_rewards_runtime
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `,
      [req.params.rewardId, user.id]
    );

    if (rewardResult.rows.length === 0) {
      res.status(404).json({ message: 'Reward not found' });
      return;
    }

    if (rewardResult.rows[0].status !== 'earned') {
      res.status(400).json({ message: 'Reward is not redeemable' });
      return;
    }

    const updated = await db.query(
      `
        UPDATE referral_rewards_runtime
        SET status = 'redeemed', redeemed_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [req.params.rewardId]
    );

    res.json({ ...updated.rows[0], amount: Number(updated.rows[0].amount) });
  } catch (error) {
    logger.error('Failed to redeem reward', error);
    res.status(500).json({ message: 'Failed to redeem reward' });
  }
});

router.get('/rewards/balance', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM referral_rewards_runtime
        WHERE user_id = $1 AND status = 'earned'
      `,
      [user.id]
    );

    res.json({ total: Number(result.rows[0]?.total || 0), currency: 'USD' });
  } catch (error) {
    logger.error('Failed to fetch reward balance', error);
    res.status(500).json({ message: 'Failed to fetch reward balance' });
  }
});

router.post('/payment-methods', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const primaryResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM referral_payment_methods_runtime WHERE user_id = $1`,
      [user.id]
    );

    const isPrimary = Number(primaryResult.rows[0]?.count || 0) === 0;
    const id = randomUUID();

    const inserted = await db.query(
      `
        INSERT INTO referral_payment_methods_runtime (
          id, user_id, method, details, is_verified, is_primary, created_at
        ) VALUES ($1, $2, $3, $4::jsonb, FALSE, $5, NOW())
        RETURNING *
      `,
      [id, user.id, req.body?.method || 'credit-card', JSON.stringify(req.body?.details || {}), isPrimary]
    );

    res.status(201).json({ ...inserted.rows[0], primary: inserted.rows[0].is_primary });
  } catch (error) {
    logger.error('Failed to add payment method', error);
    res.status(500).json({ message: 'Failed to add payment method' });
  }
});

router.get('/payment-methods', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        SELECT *
        FROM referral_payment_methods_runtime
        WHERE user_id = $1
        ORDER BY is_primary DESC, created_at DESC
      `,
      [user.id]
    );

    res.json(result.rows.map((row: any) => ({ ...row, primary: row.is_primary })));
  } catch (error) {
    logger.error('Failed to list payment methods', error);
    res.status(500).json({ message: 'Failed to list payment methods' });
  }
});

router.patch('/payment-methods/:id', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const exists = await db.query(
      'SELECT id FROM referral_payment_methods_runtime WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.id, user.id]
    );

    if (exists.rows.length === 0) {
      res.status(404).json({ message: 'Payment method not found' });
      return;
    }

    if (req.body?.isPrimary) {
      await db.query(
        'UPDATE referral_payment_methods_runtime SET is_primary = FALSE WHERE user_id = $1',
        [user.id]
      );
      await db.query(
        'UPDATE referral_payment_methods_runtime SET is_primary = TRUE WHERE id = $1',
        [req.params.id]
      );
    }

    const updated = await db.query(
      'SELECT * FROM referral_payment_methods_runtime WHERE id = $1 LIMIT 1',
      [req.params.id]
    );

    res.json({ ...updated.rows[0], primary: updated.rows[0].is_primary });
  } catch (error) {
    logger.error('Failed to update payment method', error);
    res.status(500).json({ message: 'Failed to update payment method' });
  }
});

router.delete('/payment-methods/:id', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const deleted = await db.query(
      'DELETE FROM referral_payment_methods_runtime WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, user.id]
    );

    if (deleted.rows.length === 0) {
      res.status(404).json({ message: 'Payment method not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete payment method', error);
    res.status(500).json({ message: 'Failed to delete payment method' });
  }
});

router.post('/payment-methods/:id/verify', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const updated = await db.query(
      `
        UPDATE referral_payment_methods_runtime
        SET is_verified = TRUE
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `,
      [req.params.id, user.id]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ message: 'Payment method not found' });
      return;
    }

    res.json({ ...updated.rows[0], primary: updated.rows[0].is_primary });
  } catch (error) {
    logger.error('Failed to verify payment method', error);
    res.status(500).json({ message: 'Failed to verify payment method' });
  }
});

router.post('/payouts', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const inserted = await db.query(
      `
        INSERT INTO referral_payouts_runtime (
          id, user_id, amount, currency, status, frequency, payment_method_id, requested_at
        ) VALUES ($1, $2, $3, 'USD', 'pending', $4, $5, NOW())
        RETURNING *
      `,
      [
        randomUUID(),
        user.id,
        Number(req.body?.amount || 0),
        req.body?.frequency || 'monthly',
        req.body?.paymentMethodId || null,
      ]
    );

    res.status(201).json({ ...inserted.rows[0], amount: Number(inserted.rows[0].amount) });
  } catch (error) {
    logger.error('Failed to create payout', error);
    res.status(500).json({ message: 'Failed to create payout' });
  }
});

router.get('/payouts', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        SELECT *
        FROM referral_payouts_runtime
        WHERE user_id = $1
        ORDER BY requested_at DESC
      `,
      [user.id]
    );

    res.json(result.rows.map((row: any) => ({ ...row, amount: Number(row.amount) })));
  } catch (error) {
    logger.error('Failed to fetch payouts', error);
    res.status(500).json({ message: 'Failed to fetch payouts' });
  }
});

router.get('/payouts/:id', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      'SELECT * FROM referral_payouts_runtime WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.id, user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Payout not found' });
      return;
    }

    res.json({ ...result.rows[0], amount: Number(result.rows[0].amount) });
  } catch (error) {
    logger.error('Failed to fetch payout', error);
    res.status(500).json({ message: 'Failed to fetch payout' });
  }
});

router.post('/posts', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const inserted = await db.query(
      `
        INSERT INTO referral_posts_runtime (
          id, user_id, user_name, user_level, type, title, content, tags, likes, comments, shares, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 0, 0, 0, NOW())
        RETURNING *
      `,
      [
        randomUUID(),
        user.id,
        user.name,
        user.level,
        req.body?.type || 'discussion',
        req.body?.title || 'Untitled',
        req.body?.content || '',
        JSON.stringify(Array.isArray(req.body?.tags) ? req.body.tags : []),
      ]
    );

    const row = inserted.rows[0];
    res.status(201).json({
      ...row,
      tags: Array.isArray(row.tags) ? row.tags : [],
      user: { name: row.user_name, level: row.user_level },
    });
  } catch (error) {
    logger.error('Failed to create post', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

router.get('/posts', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      'SELECT * FROM referral_posts_runtime ORDER BY created_at DESC LIMIT 200'
    );

    res.json(
      result.rows.map((row: any) => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : [],
        user: { name: row.user_name, level: row.user_level },
      }))
    );
  } catch (error) {
    logger.error('Failed to list posts', error);
    res.status(500).json({ message: 'Failed to list posts' });
  }
});

router.get('/posts/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'SELECT * FROM referral_posts_runtime WHERE id = $1 LIMIT 1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const row = result.rows[0];
    res.json({
      ...row,
      tags: Array.isArray(row.tags) ? row.tags : [],
      user: { name: row.user_name, level: row.user_level },
    });
  } catch (error) {
    logger.error('Failed to get post', error);
    res.status(500).json({ message: 'Failed to get post' });
  }
});

router.post('/posts/:id/like', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const likeResult = await db.query(
      `
        INSERT INTO referral_post_likes_runtime (id, post_id, user_id, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (post_id, user_id) DO NOTHING
        RETURNING id
      `,
      [randomUUID(), req.params.id, user.id]
    );

    if (likeResult.rows.length > 0) {
      await db.query(
        'UPDATE referral_posts_runtime SET likes = likes + 1 WHERE id = $1',
        [req.params.id]
      );
    }

    const post = await db.query(
      'SELECT likes FROM referral_posts_runtime WHERE id = $1 LIMIT 1',
      [req.params.id]
    );

    if (post.rows.length === 0) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    res.json({ success: true, likes: Number(post.rows[0].likes) });
  } catch (error) {
    logger.error('Failed to like post', error);
    res.status(500).json({ message: 'Failed to like post' });
  }
});

router.delete('/posts/:id/like', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const deleted = await db.query(
      'DELETE FROM referral_post_likes_runtime WHERE post_id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, user.id]
    );

    if (deleted.rows.length > 0) {
      await db.query(
        'UPDATE referral_posts_runtime SET likes = GREATEST(0, likes - 1) WHERE id = $1',
        [req.params.id]
      );
    }

    const post = await db.query(
      'SELECT likes FROM referral_posts_runtime WHERE id = $1 LIMIT 1',
      [req.params.id]
    );

    if (post.rows.length === 0) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    res.json({ success: true, likes: Number(post.rows[0].likes) });
  } catch (error) {
    logger.error('Failed to unlike post', error);
    res.status(500).json({ message: 'Failed to unlike post' });
  }
});

router.post('/posts/:id/comments', async (req: Request, res: Response) => {
  const user = getUserContext(req);
  const content = String(req.body?.content || '').trim();

  if (!content) {
    res.status(400).json({ message: 'content is required' });
    return;
  }

  try {
    const postExists = await db.query(
      'SELECT id FROM referral_posts_runtime WHERE id = $1 LIMIT 1',
      [req.params.id]
    );

    if (postExists.rows.length === 0) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const inserted = await db.query(
      `
        INSERT INTO referral_comments_runtime (
          id, post_id, user_id, user_name, content, likes, created_at
        ) VALUES ($1, $2, $3, $4, $5, 0, NOW())
        RETURNING *
      `,
      [randomUUID(), req.params.id, user.id, user.name, content]
    );

    await db.query(
      'UPDATE referral_posts_runtime SET comments = comments + 1 WHERE id = $1',
      [req.params.id]
    );

    const row = inserted.rows[0];
    res.status(201).json({
      ...row,
      user: { name: row.user_name },
    });
  } catch (error) {
    logger.error('Failed to create comment', error);
    res.status(500).json({ message: 'Failed to create comment' });
  }
});

router.get('/posts/:id/comments', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `
        SELECT *
        FROM referral_comments_runtime
        WHERE post_id = $1
        ORDER BY created_at ASC
      `,
      [req.params.id]
    );

    res.json(
      result.rows.map((row: any) => ({
        ...row,
        user: { name: row.user_name },
      }))
    );
  } catch (error) {
    logger.error('Failed to list comments', error);
    res.status(500).json({ message: 'Failed to list comments' });
  }
});

router.post('/comments/:id/like', async (req: Request, res: Response) => {
  try {
    const updated = await db.query(
      `
        UPDATE referral_comments_runtime
        SET likes = likes + 1
        WHERE id = $1
        RETURNING likes
      `,
      [req.params.id]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    res.json({ success: true, likes: Number(updated.rows[0].likes) });
  } catch (error) {
    logger.error('Failed to like comment', error);
    res.status(500).json({ message: 'Failed to like comment' });
  }
});

router.post('/contributions', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const inserted = await db.query(
      `
        INSERT INTO referral_contributions_runtime (
          id, user_id, type, title, description, points, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `,
      [
        randomUUID(),
        user.id,
        req.body?.type || 'activity',
        req.body?.title || 'Contribution',
        req.body?.description || '',
        5,
      ]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (error) {
    logger.error('Failed to log contribution', error);
    res.status(500).json({ message: 'Failed to log contribution' });
  }
});

router.get('/contributions', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        SELECT *
        FROM referral_contributions_runtime
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [user.id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to list contributions', error);
    res.status(500).json({ message: 'Failed to list contributions' });
  }
});

router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `
        SELECT user_id, COALESCE(SUM(points), 0)::int AS points
        FROM referral_contributions_runtime
        GROUP BY user_id
        ORDER BY points DESC
        LIMIT 10
      `
    );

    res.json(
      result.rows.map((row: any) => ({
        userId: row.user_id,
        name: row.user_id,
        points: Number(row.points),
        level:
          Number(row.points) >= 1000
            ? 'platinum'
            : Number(row.points) >= 500
              ? 'gold'
              : Number(row.points) >= 200
                ? 'silver'
                : 'bronze',
      }))
    );
  } catch (error) {
    logger.error('Failed to build leaderboard', error);
    res.status(500).json({ message: 'Failed to build leaderboard' });
  }
});

router.get('/member', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const pointsResult = await db.query(
      `
        SELECT COALESCE(SUM(points), 0)::int AS points
        FROM referral_contributions_runtime
        WHERE user_id = $1
      `,
      [user.id]
    );

    const rewardsResult = await db.query(
      'SELECT COUNT(*)::int AS count FROM referral_rewards_runtime WHERE user_id = $1',
      [user.id]
    );

    const completedResult = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM referral_referrals_runtime
        WHERE user_id = $1 AND status = 'completed'
      `,
      [user.id]
    );

    const points = Number(pointsResult.rows[0]?.points || 0);

    res.json({
      userId: user.id,
      name: user.name,
      level:
        points >= 1000 ? 'platinum' : points >= 500 ? 'gold' : points >= 200 ? 'silver' : 'bronze',
      points,
      rewardsEarned: Number(rewardsResult.rows[0]?.count || 0),
      referralsCompleted: Number(completedResult.rows[0]?.count || 0),
    });
  } catch (error) {
    logger.error('Failed to fetch member profile', error);
    res.status(500).json({ message: 'Failed to fetch member profile' });
  }
});

router.get('/analytics/referrals', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        SELECT status, COUNT(*)::int AS count
        FROM referral_referrals_runtime
        WHERE user_id = $1
        GROUP BY status
      `,
      [user.id]
    );

    const stats = {
      pending: 0,
      active: 0,
      completed: 0,
      expired: 0,
    };

    let total = 0;
    for (const row of result.rows) {
      const count = Number(row.count || 0);
      total += count;
      if (row.status in stats) {
        (stats as any)[row.status] = count;
      }
    }

    res.json({
      ...stats,
      total,
      conversionRate: total > 0 ? (stats.completed / total) * 100 : 0,
    });
  } catch (error) {
    logger.error('Failed to fetch referral analytics', error);
    res.status(500).json({ message: 'Failed to fetch referral analytics' });
  }
});

router.get('/analytics/payouts', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const summary = await db.query(
      `
        SELECT
          COALESCE(SUM(amount), 0)::numeric AS total_requested,
          COUNT(*)::int AS total_count,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
        FROM referral_payouts_runtime
        WHERE user_id = $1
      `,
      [user.id]
    );

    const row = summary.rows[0] || {};
    res.json({
      totalRequested: Number(row.total_requested || 0),
      totalCount: Number(row.total_count || 0),
      pendingCount: Number(row.pending_count || 0),
      completedCount: Number(row.completed_count || 0),
    });
  } catch (error) {
    logger.error('Failed to fetch payout analytics', error);
    res.status(500).json({ message: 'Failed to fetch payout analytics' });
  }
});

router.get('/analytics/community', async (_req: Request, res: Response) => {
  try {
    const stats = await db.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM referral_posts_runtime) AS total_posts,
          (SELECT COUNT(*)::int FROM referral_comments_runtime) AS total_comments,
          (SELECT COALESCE(SUM(likes), 0)::int FROM referral_posts_runtime) AS total_likes
      `
    );

    const row = stats.rows[0] || {};
    res.json({
      totalPosts: Number(row.total_posts || 0),
      totalComments: Number(row.total_comments || 0),
      totalLikes: Number(row.total_likes || 0),
    });
  } catch (error) {
    logger.error('Failed to fetch community analytics', error);
    res.status(500).json({ message: 'Failed to fetch community analytics' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const user = getUserContext(req);

  try {
    const result = await db.query(
      `
        SELECT *
        FROM referral_referrals_runtime
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `,
      [req.params.id, user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Referral not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch referral', error);
    res.status(500).json({ message: 'Failed to fetch referral' });
  }
});

export default router;
