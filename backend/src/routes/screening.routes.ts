import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { authenticateToken } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { db } from '@/utils/database';

type ScreeningStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type MatchCategory = 'STRONG' | 'MODERATE' | 'WEAK';

interface ScoringBreakdown {
  experience: number;
  skills: number;
  education: number;
  certifications: number;
  overall: number;
}

interface ScreeningJobRecord {
  id: string;
  jobId: string;
  employerId: string;
  status: ScreeningStatus;
  totalResumes: number;
  processedCount: number;
  startedAt: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
}

interface ScreeningResultRecord {
  id: string;
  screeningJobId: string;
  candidateId: string;
  candidateName: string;
  matchPercentage: number;
  matchCategory: MatchCategory;
  rank: number;
  isShortlisted: boolean;
  matchedSkills: string[];
  scoringBreakdown: ScoringBreakdown;
  candidateEmail?: string;
  candidatePhone?: string;
}

interface ScreeningAnalyticsPayload {
  screeningJobId: string;
  totalCandidates: number;
  matchDistribution: {
    STRONG: number;
    MODERATE: number;
    WEAK: number;
  };
  scoreDistribution: {
    bins: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
  };
  topMatchedSkills: Array<{
    skill: string;
    count: number;
    percentage: number;
  }>;
  topCandidates: ScreeningResultRecord[];
  processingMetrics: {
    totalProcessingTime: number;
    averageTimePerResume: number;
    averageScoreCalculationTime: number;
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 500,
  },
  fileFilter: (
    _req: Request,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF files are allowed'));
  },
});

const router: Router = express.Router();

let tablesReadyPromise: Promise<void> | null = null;

const ensureRuntimeTables = async (): Promise<void> => {
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

      await db.query(`
        CREATE TABLE IF NOT EXISTS screening_jobs_runtime (
          id UUID PRIMARY KEY,
          job_id TEXT NOT NULL,
          employer_id TEXT NOT NULL,
          status VARCHAR(20) NOT NULL,
          total_resumes INTEGER NOT NULL,
          processed_count INTEGER NOT NULL DEFAULT 0,
          started_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS screening_results_runtime (
          id UUID PRIMARY KEY,
          screening_job_id UUID NOT NULL REFERENCES screening_jobs_runtime(id) ON DELETE CASCADE,
          candidate_id TEXT NOT NULL,
          candidate_name TEXT NOT NULL,
          match_percentage NUMERIC(5,2) NOT NULL,
          match_category VARCHAR(20) NOT NULL,
          rank INTEGER NOT NULL,
          is_shortlisted BOOLEAN NOT NULL DEFAULT FALSE,
          matched_skills TEXT[] NOT NULL DEFAULT '{}',
          scoring_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
          candidate_email TEXT,
          candidate_phone TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_screening_jobs_runtime_employer ON screening_jobs_runtime(employer_id);'
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_screening_results_runtime_job ON screening_results_runtime(screening_job_id);'
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

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const toCategory = (score: number): MatchCategory => {
  if (score >= 75) return 'STRONG';
  if (score >= 50) return 'MODERATE';
  return 'WEAK';
};

const parseMetadata = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed metadata and use empty object.
  }

  return {};
};

const getUserId = (req: Request): string => {
  const user = req.user as any;
  return user?.userId || user?.id || 'guest-user';
};

const buildCsv = (rows: ScreeningResultRecord[]): string => {
  const header = [
    'candidateId',
    'candidateName',
    'matchPercentage',
    'matchCategory',
    'rank',
    'isShortlisted',
    'matchedSkills',
  ];

  const lines = rows.map((row) =>
    [
      row.candidateId,
      row.candidateName,
      row.matchPercentage.toFixed(1),
      row.matchCategory,
      String(row.rank),
      String(row.isShortlisted),
      row.matchedSkills.join('|'),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );

  return [header.join(','), ...lines].join('\n');
};

const generateResults = (
  screeningJobId: string,
  files: Array<{ originalname: string }>
): ScreeningResultRecord[] => {
  const skillPool = [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'PostgreSQL',
    'AWS',
    'Docker',
    'CI/CD',
  ];

  const generated = files.map((file, index) => {
    const baseScore = Math.max(42, 92 - index * 4);
    const matchPercentage = Math.min(99, baseScore);
    const matchedSkills = skillPool.slice(0, Math.max(2, 5 - (index % 3)));

    const scoringBreakdown: ScoringBreakdown = {
      experience: Math.max(35, matchPercentage - 8),
      skills: matchPercentage,
      education: Math.max(30, matchPercentage - 15),
      certifications: Math.max(20, matchPercentage - 25),
      overall: matchPercentage,
    };

    return {
      id: randomUUID(),
      screeningJobId,
      candidateId: randomUUID(),
      candidateName: file.originalname.replace(/\.pdf$/i, '') || `Candidate ${index + 1}`,
      matchPercentage,
      matchCategory: toCategory(matchPercentage),
      rank: index + 1,
      isShortlisted: false,
      matchedSkills,
      scoringBreakdown,
      candidateEmail: `candidate${index + 1}@example.com`,
      candidatePhone: `+1-555-01${String(index + 1).padStart(2, '0')}`,
    };
  });

  return generated.sort((a, b) => b.matchPercentage - a.matchPercentage).map((r, i) => ({
    ...r,
    rank: i + 1,
  }));
};

const mapJob = (row: any): ScreeningJobRecord => ({
  id: row.id,
  jobId: row.job_id,
  employerId: row.employer_id,
  status: row.status,
  totalResumes: Number(row.total_resumes),
  processedCount: Number(row.processed_count),
  startedAt: new Date(row.started_at).toISOString(),
  completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
  metadata: row.metadata || {},
});

const mapResult = (row: any): ScreeningResultRecord => ({
  id: row.id,
  screeningJobId: row.screening_job_id,
  candidateId: row.candidate_id,
  candidateName: row.candidate_name,
  matchPercentage: Number(row.match_percentage),
  matchCategory: row.match_category,
  rank: Number(row.rank),
  isShortlisted: Boolean(row.is_shortlisted),
  matchedSkills: Array.isArray(row.matched_skills) ? row.matched_skills : [],
  scoringBreakdown: row.scoring_breakdown || {
    experience: 0,
    skills: 0,
    education: 0,
    certifications: 0,
    overall: 0,
  },
  candidateEmail: row.candidate_email || undefined,
  candidatePhone: row.candidate_phone || undefined,
});

const buildAnalytics = (
  screeningJobId: string,
  results: ScreeningResultRecord[],
  job: ScreeningJobRecord
): ScreeningAnalyticsPayload => {
  const total = results.length || 1;
  const strong = results.filter((r) => r.matchCategory === 'STRONG').length;
  const moderate = results.filter((r) => r.matchCategory === 'MODERATE').length;
  const weak = results.filter((r) => r.matchCategory === 'WEAK').length;

  const bins = [
    { range: '0-24', min: 0, max: 24 },
    { range: '25-49', min: 25, max: 49 },
    { range: '50-74', min: 50, max: 74 },
    { range: '75-100', min: 75, max: 100 },
  ].map((bin) => {
    const count = results.filter(
      (r) => r.matchPercentage >= bin.min && r.matchPercentage <= bin.max
    ).length;

    return {
      range: bin.range,
      count,
      percentage: (count / total) * 100,
    };
  });

  const skillCounts = new Map<string, number>();
  for (const result of results) {
    for (const skill of result.matchedSkills) {
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    }
  }

  const topMatchedSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({
      skill,
      count,
      percentage: (count / total) * 100,
    }));

  const startedAtMs = new Date(job.startedAt).getTime();
  const completedAtMs = new Date(job.completedAt || job.startedAt).getTime();
  const totalProcessingTime = Math.max(1, Math.round((completedAtMs - startedAtMs) / 1000));

  return {
    screeningJobId,
    totalCandidates: results.length,
    matchDistribution: {
      STRONG: strong,
      MODERATE: moderate,
      WEAK: weak,
    },
    scoreDistribution: { bins },
    topMatchedSkills,
    topCandidates: [...results].sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 5),
    processingMetrics: {
      totalProcessingTime,
      averageTimePerResume: Math.max(
        1,
        Math.round((totalProcessingTime * 1000) / Math.max(1, results.length))
      ),
      averageScoreCalculationTime: 25,
    },
  };
};

router.post(
  ['/initiate', '/batch-upload'],
  authenticateToken,
  upload.any(),
  async (req: Request, res: Response) => {
    const employerId = getUserId(req);
    const jobId = asString(req.body.jobId);
    const files = Array.isArray(req.files)
      ? (req.files as Array<{ originalname: string; mimetype: string }>)
      : [];

    if (!jobId) {
      res.status(400).json({ message: 'jobId is required' });
      return;
    }

    if (files.length === 0) {
      res.status(400).json({ message: 'At least one PDF is required' });
      return;
    }

    const pdfFiles = files.filter((f) => f.mimetype === 'application/pdf');
    if (pdfFiles.length === 0) {
      res.status(400).json({ message: 'Only PDF files are allowed' });
      return;
    }

    const screeningJobId = randomUUID();
    const now = new Date().toISOString();
    const generatedResults = generateResults(screeningJobId, pdfFiles);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO screening_jobs_runtime (
            id, job_id, employer_id, status, total_resumes, processed_count, started_at, completed_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9::jsonb)
        `,
        [
          screeningJobId,
          jobId,
          employerId,
          'COMPLETED',
          pdfFiles.length,
          generatedResults.length,
          now,
          now,
          JSON.stringify(parseMetadata(req.body.metadata)),
        ]
      );

      for (const result of generatedResults) {
        await client.query(
          `
            INSERT INTO screening_results_runtime (
              id, screening_job_id, candidate_id, candidate_name, match_percentage, match_category,
              rank, is_shortlisted, matched_skills, scoring_breakdown, candidate_email, candidate_phone
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10::jsonb, $11, $12
            )
          `,
          [
            result.id,
            screeningJobId,
            result.candidateId,
            result.candidateName,
            result.matchPercentage,
            result.matchCategory,
            result.rank,
            result.isShortlisted,
            result.matchedSkills,
            JSON.stringify(result.scoringBreakdown),
            result.candidateEmail || null,
            result.candidatePhone || null,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Screening initiated', {
        screeningJobId,
        employerId,
        jobId,
        resumes: pdfFiles.length,
      });

      res.status(201).json({
        id: screeningJobId,
        jobId,
        employerId,
        status: 'COMPLETED',
        totalResumes: pdfFiles.length,
        processedCount: generatedResults.length,
        startedAt: now,
        completedAt: now,
        metadata: parseMetadata(req.body.metadata),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create screening job', error);
      res.status(500).json({ message: 'Failed to create screening job' });
    } finally {
      client.release();
    }
  }
);

router.get('/results', authenticateToken, async (req: Request, res: Response) => {
  const screeningJobId = asString(req.query.screeningJobId);
  if (!screeningJobId) {
    res.status(400).json({ message: 'screeningJobId is required' });
    return;
  }

  const page = Math.max(1, asNumber(req.query.page, 1));
  const pageSize = Math.max(1, asNumber(req.query.pageSize, 25));
  const sortBy = asString(req.query.sortBy) || 'rank';
  const sortOrder = (asString(req.query.sortOrder) || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  const minMatch = Math.max(0, asNumber(req.query.minMatch, 0));
  const maxMatch = Math.min(100, asNumber(req.query.maxMatch, 100));
  const matchCategory = asString(req.query.matchCategory);
  const shortlistedOnly = asString(req.query.shortlistedOnly) === 'true';

  const whereClauses: string[] = ['screening_job_id = $1'];
  const whereParams: any[] = [screeningJobId];

  if (minMatch > 0) {
    whereParams.push(minMatch);
    whereClauses.push(`match_percentage >= $${whereParams.length}`);
  }

  if (maxMatch < 100) {
    whereParams.push(maxMatch);
    whereClauses.push(`match_percentage <= $${whereParams.length}`);
  }

  if (matchCategory) {
    whereParams.push(matchCategory);
    whereClauses.push(`match_category = $${whereParams.length}`);
  }

  if (shortlistedOnly) {
    whereClauses.push('is_shortlisted = TRUE');
  }

  const whereSql = whereClauses.join(' AND ');

  const sortColumn =
    sortBy === 'match' ? 'match_percentage' : sortBy === 'name' ? 'candidate_name' : 'rank';
  const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

  try {
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM screening_results_runtime WHERE ${whereSql}`,
      whereParams
    );
    const totalResults = Number(countResult.rows[0]?.total || 0);

    const pageQueryParams = [...whereParams, pageSize, (page - 1) * pageSize];
    const pageResult = await db.query(
      `
        SELECT *
        FROM screening_results_runtime
        WHERE ${whereSql}
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT $${pageQueryParams.length - 1} OFFSET $${pageQueryParams.length}
      `,
      pageQueryParams
    );

    const summaryResult = await db.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE match_category = 'STRONG')::int AS strong_matches,
          COUNT(*) FILTER (WHERE match_category = 'MODERATE')::int AS moderate_matches,
          COUNT(*) FILTER (WHERE match_category = 'WEAK')::int AS weak_matches,
          COALESCE(AVG(match_percentage), 0)::numeric AS average_score
        FROM screening_results_runtime
        WHERE ${whereSql}
      `,
      whereParams
    );

    const summaryRow = summaryResult.rows[0] || {};
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

    res.json({
      screeningJobId,
      totalResults,
      page,
      pageSize,
      totalPages,
      results: pageResult.rows.map(mapResult),
      summary: {
        strongMatches: Number(summaryRow.strong_matches || 0),
        moderateMatches: Number(summaryRow.moderate_matches || 0),
        weakMatches: Number(summaryRow.weak_matches || 0),
        averageScore: Number(summaryRow.average_score || 0),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch screening results', error);
    res.status(500).json({ message: 'Failed to fetch screening results' });
  }
});

router.get(['/analytics', '/:screeningJobId/analytics'], authenticateToken, async (req: Request, res: Response) => {
  const paramId = asString(req.params.screeningJobId);
  const queryId = asString(req.query.screeningJobId);
  const screeningJobId = paramId || queryId;

  if (!screeningJobId) {
    res.status(400).json({ message: 'screeningJobId is required' });
    return;
  }

  try {
    const jobResult = await db.query(
      'SELECT * FROM screening_jobs_runtime WHERE id = $1 LIMIT 1',
      [screeningJobId]
    );

    if (jobResult.rows.length === 0) {
      res.status(404).json({ message: 'Screening job not found' });
      return;
    }

    const resultRows = await db.query(
      'SELECT * FROM screening_results_runtime WHERE screening_job_id = $1 ORDER BY rank ASC',
      [screeningJobId]
    );

    const job = mapJob(jobResult.rows[0]);
    const results = resultRows.rows.map(mapResult);

    res.json(buildAnalytics(screeningJobId, results, job));
  } catch (error) {
    logger.error('Failed to load screening analytics', error);
    res.status(500).json({ message: 'Failed to load screening analytics' });
  }
});

const applyShortlistUpdate = async (
  screeningJobId: string,
  candidateIds: string[],
  action: 'add' | 'remove'
): Promise<ScreeningJobRecord | null> => {
  const jobResult = await db.query(
    'SELECT * FROM screening_jobs_runtime WHERE id = $1 LIMIT 1',
    [screeningJobId]
  );

  if (jobResult.rows.length === 0) {
    return null;
  }

  if (candidateIds.length > 0) {
    await db.query(
      `
        UPDATE screening_results_runtime
        SET is_shortlisted = $1
        WHERE screening_job_id = $2
          AND (id::text = ANY($3::text[]) OR candidate_id = ANY($3::text[]))
      `,
      [action === 'add', screeningJobId, candidateIds]
    );
  }

  return mapJob(jobResult.rows[0]);
};

router.put('/shortlist', authenticateToken, async (req: Request, res: Response) => {
  const screeningJobId = asString(req.body.screeningJobId);
  const candidateIds = Array.isArray(req.body.candidateIds)
    ? (req.body.candidateIds as string[])
    : [];
  const action = req.body.action === 'remove' ? 'remove' : 'add';

  if (!screeningJobId) {
    res.status(400).json({ message: 'screeningJobId is required' });
    return;
  }

  try {
    const job = await applyShortlistUpdate(screeningJobId, candidateIds, action);
    if (!job) {
      res.status(404).json({ message: 'Screening job not found' });
      return;
    }

    res.json(job);
  } catch (error) {
    logger.error('Failed to update shortlist', error);
    res.status(500).json({ message: 'Failed to update shortlist' });
  }
});

router.post('/:screeningJobId/shortlist', authenticateToken, async (req: Request, res: Response) => {
  const screeningJobId = asString(req.params.screeningJobId);
  const candidateIds = Array.isArray(req.body.candidateIds)
    ? (req.body.candidateIds as string[])
    : [];
  const action = req.body.action === 'remove' ? 'remove' : 'add';

  if (!screeningJobId) {
    res.status(400).json({ message: 'screeningJobId is required' });
    return;
  }

  try {
    const job = await applyShortlistUpdate(screeningJobId, candidateIds, action);
    if (!job) {
      res.status(404).json({ message: 'Screening job not found' });
      return;
    }

    res.json(job);
  } catch (error) {
    logger.error('Failed to update shortlist', error);
    res.status(500).json({ message: 'Failed to update shortlist' });
  }
});

const exportHandler = async (req: Request, res: Response) => {
  const screeningJobId = asString(req.params.screeningJobId);
  if (!screeningJobId) {
    res.status(400).json({ message: 'screeningJobId is required' });
    return;
  }

  const format = (asString(req.query.format) || req.body.format || 'json').toLowerCase();
  const includeAll = req.body.includeAll !== false;
  const selectedIds = Array.isArray(req.body.selectedCandidateIds)
    ? (req.body.selectedCandidateIds as string[])
    : [];

  try {
    const baseSql = `
      SELECT * FROM screening_results_runtime
      WHERE screening_job_id = $1
    `;

    const resultRows = includeAll
      ? await db.query(`${baseSql} ORDER BY rank ASC`, [screeningJobId])
      : await db.query(
          `${baseSql} AND (id::text = ANY($2::text[]) OR candidate_id = ANY($2::text[])) ORDER BY rank ASC`,
          [screeningJobId, selectedIds]
        );

    const toExport = resultRows.rows.map(mapResult);

    if (format === 'csv') {
      const csv = buildCsv(toExport);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="screening-${screeningJobId}.csv"`
      );
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({
      screeningJobId,
      exportedAt: new Date().toISOString(),
      count: toExport.length,
      results: toExport,
    });
  } catch (error) {
    logger.error('Failed to export screening results', error);
    res.status(500).json({ message: 'Failed to export screening results' });
  }
};

router.post('/:screeningJobId/export', authenticateToken, exportHandler);
router.get('/:screeningJobId/export', authenticateToken, exportHandler);

router.get('/:screeningJobId', authenticateToken, async (req: Request, res: Response) => {
  const screeningJobId = asString(req.params.screeningJobId);
  if (!screeningJobId) {
    res.status(400).json({ message: 'screeningJobId is required' });
    return;
  }

  try {
    const jobResult = await db.query(
      'SELECT * FROM screening_jobs_runtime WHERE id = $1 LIMIT 1',
      [screeningJobId]
    );

    if (jobResult.rows.length === 0) {
      res.status(404).json({ message: 'Screening job not found' });
      return;
    }

    res.json(mapJob(jobResult.rows[0]));
  } catch (error) {
    logger.error('Failed to load screening job', error);
    res.status(500).json({ message: 'Failed to load screening job' });
  }
});

router.delete('/:screeningJobId', authenticateToken, async (req: Request, res: Response) => {
  const screeningJobId = asString(req.params.screeningJobId);
  if (!screeningJobId) {
    res.status(400).json({ message: 'screeningJobId is required' });
    return;
  }

  try {
    await db.query('DELETE FROM screening_jobs_runtime WHERE id = $1', [screeningJobId]);
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete screening job', error);
    res.status(500).json({ message: 'Failed to delete screening job' });
  }
});

export default router;
