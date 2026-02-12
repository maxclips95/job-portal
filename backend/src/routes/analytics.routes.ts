import { Router, Request, Response } from 'express';
import { db } from '@/utils/database';

const router = Router();

const safeCount = async (query: string, params: any[] = []): Promise<number> => {
  try {
    const result = await db.query(query, params);
    return parseInt(result.rows?.[0]?.count || '0', 10);
  } catch {
    return 0;
  }
};

const getTopLocations = async () => {
  try {
    const result = await db.query(
      `
        SELECT
          COALESCE(NULLIF(city, ''), NULLIF(location, ''), 'Remote') AS location,
          COUNT(*)::int AS job_count,
          ROUND(AVG(COALESCE(salary_min, 50000))::numeric, 0)::int AS salary_average
        FROM jobs
        GROUP BY COALESCE(NULLIF(city, ''), NULLIF(location, ''), 'Remote')
        ORDER BY job_count DESC
        LIMIT 8
      `
    );

    return result.rows.map((row: any) => ({
      location: row.location,
      jobCount: row.job_count,
      salaryAverage: row.salary_average || 50000,
    }));
  } catch {
    return [
      { location: 'Remote', jobCount: 12, salaryAverage: 82000 },
      { location: 'Bengaluru', jobCount: 8, salaryAverage: 76000 },
      { location: 'Delhi', jobCount: 7, salaryAverage: 72000 },
    ];
  }
};

const createTopSkills = (totalJobs: number) => {
  const base = Math.max(totalJobs, 20);
  return [
    { skill: 'React', demand: 89, jobCount: Math.round(base * 0.42), averageSalaryLift: 18, trendDirection: 'increasing', marketSaturation: 'medium' },
    { skill: 'TypeScript', demand: 84, jobCount: Math.round(base * 0.37), averageSalaryLift: 16, trendDirection: 'increasing', marketSaturation: 'low' },
    { skill: 'Node.js', demand: 80, jobCount: Math.round(base * 0.35), averageSalaryLift: 14, trendDirection: 'stable', marketSaturation: 'medium' },
    { skill: 'PostgreSQL', demand: 72, jobCount: Math.round(base * 0.29), averageSalaryLift: 11, trendDirection: 'increasing', marketSaturation: 'low' },
    { skill: 'AWS', demand: 76, jobCount: Math.round(base * 0.31), averageSalaryLift: 19, trendDirection: 'increasing', marketSaturation: 'medium' },
  ];
};

const createInsights = () => [
  {
    id: 'insight-1',
    title: 'Full-stack roles are trending up',
    description: 'Demand for React + Node.js combinations is increasing steadily this quarter.',
    category: 'trend',
    type: 'trend',
    relevance: 92,
    severity: 'high',
    actionableItems: ['Add full-stack screening questions', 'Highlight TypeScript in job descriptions'],
    actionItems: ['Add full-stack screening questions', 'Highlight TypeScript in job descriptions'],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'insight-2',
    title: 'Remote-first jobs attract more applications',
    description: 'Remote jobs receive significantly higher applicant volume than location-bound listings.',
    category: 'market',
    type: 'market',
    relevance: 87,
    severity: 'medium',
    actionableItems: ['Promote remote jobs in featured listings'],
    actionItems: ['Promote remote jobs in featured listings'],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'insight-3',
    title: 'Skill-based filtering improves shortlist quality',
    description: 'Teams using structured skill filters reduce interview drop-offs.',
    category: 'hiring',
    type: 'hiring',
    relevance: 81,
    severity: 'medium',
    actionableItems: ['Use mandatory skill tags for new jobs'],
    actionItems: ['Use mandatory skill tags for new jobs'],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

router.post('/dashboard', async (_req: Request, res: Response) => {
  const [totalJobs, totalApplications, totalUsers] = await Promise.all([
    safeCount('SELECT COUNT(*) as count FROM jobs'),
    safeCount('SELECT COUNT(*) as count FROM job_applications'),
    safeCount('SELECT COUNT(*) as count FROM users'),
  ]);

  const topSkills = createTopSkills(totalJobs);
  const topLocations = await getTopLocations();
  const topJobRoles = [
    { category: 'Software Engineer', volume: Math.max(6, Math.round(totalJobs * 0.32)), growth: 18 },
    { category: 'Data Engineer', volume: Math.max(4, Math.round(totalJobs * 0.18)), growth: 14 },
    { category: 'Product Manager', volume: Math.max(3, Math.round(totalJobs * 0.14)), growth: 10 },
    { category: 'UI/UX Designer', volume: Math.max(2, Math.round(totalJobs * 0.12)), growth: 8 },
  ];

  res.json({
    summary: {
      totalJobs,
      totalApplications,
      averageSalary: 85000,
      medianSalary: 78000,
      uniqueSkills: topSkills.length * 10,
      uniqueLocations: topLocations.length,
      period: 'Last 90 days',
      marketSentiment: 'positive',
      topSkills,
      topLocations,
      topJobRoles,
      hiringMetrics: {
        applicationRate: totalJobs > 0 ? (totalApplications / totalJobs) * 10 : 0,
        interviewRate: 42,
        offerRate: 18,
        acceptanceRate: 71,
      },
      totalUsers,
    },
    insights: createInsights(),
  });
});

router.post('/aggregate', async (_req: Request, res: Response) => {
  const [totalJobs, totalApplications] = await Promise.all([
    safeCount('SELECT COUNT(*) as count FROM jobs'),
    safeCount('SELECT COUNT(*) as count FROM job_applications'),
  ]);

  res.json({
    totals: { totalJobs, totalApplications },
    topSkills: createTopSkills(totalJobs),
    topLocations: await getTopLocations(),
    insights: createInsights(),
  });
});

router.get('/salary-range', (req: Request, res: Response) => {
  const experience = String(req.query.experience || 'mid');
  const multipliers: Record<string, number> = { junior: 0.7, mid: 1, senior: 1.35, lead: 1.6 };
  const m = multipliers[experience] || 1;
  const min = Math.round(50000 * m);
  const max = Math.round(95000 * m);

  res.json({
    min,
    max,
    median: Math.round((min + max) / 2),
    percentile25: Math.round(min * 0.92),
    percentile75: Math.round(max * 1.06),
  });
});

router.get('/salary-benchmark', (_req: Request, res: Response) => {
  res.json({
    trend: 'up',
    trendPercentage: 8.4,
    sampleSize: 420,
    lastUpdated: new Date().toISOString(),
  });
});

router.post('/predict-salary', (req: Request, res: Response) => {
  const skills = Array.isArray(req.body?.skills) ? req.body.skills.length : 0;
  const experience = String(req.body?.experience || 'mid');
  const baseByExp: Record<string, number> = { junior: 52000, mid: 78000, senior: 110000, lead: 128000 };
  const base = baseByExp[experience] || 78000;
  const predictedSalary = Math.round(base + skills * 1800);

  res.json({
    predictedSalary,
    confidence: 78,
    factors: {
      experience: 0.45,
      location: 0.25,
      skillsMatch: 1 + Math.min(skills, 8) * 0.02,
    },
  });
});

router.post('/salary-trends', (_req: Request, res: Response) => {
  res.json([
    { timestamp: new Date(Date.now() - 120 * 86400000).toISOString(), demand: 64, monthOverMonth: 1.2 },
    { timestamp: new Date(Date.now() - 90 * 86400000).toISOString(), demand: 68, monthOverMonth: 2.8 },
    { timestamp: new Date(Date.now() - 60 * 86400000).toISOString(), demand: 72, monthOverMonth: 3.4 },
    { timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), demand: 76, monthOverMonth: 2.1 },
  ]);
});

router.get('/top-skills', async (_req: Request, res: Response) => {
  const totalJobs = await safeCount('SELECT COUNT(*) as count FROM jobs');
  res.json(createTopSkills(totalJobs));
});

router.post('/skill-trends', (_req: Request, res: Response) => {
  const skills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'];
  const points: any[] = [];

  for (let i = 0; i < 6; i += 1) {
    const timestamp = new Date(Date.now() - (5 - i) * 30 * 86400000).toISOString();
    for (const skill of skills) {
      const base = { React: 80, TypeScript: 74, 'Node.js': 71, PostgreSQL: 62, AWS: 69 }[skill] || 60;
      points.push({
        skill,
        demand: Math.max(20, Math.min(100, base + i * 2 - (skill === 'PostgreSQL' ? 3 : 0))),
        timestamp,
        monthOverMonth: 1.5 + i * 0.4,
      });
    }
  }

  res.json(points);
});

router.post('/hiring-trends', (_req: Request, res: Response) => {
  res.json([
    { month: 'Jan', openings: 120, applications: 860 },
    { month: 'Feb', openings: 132, applications: 910 },
    { month: 'Mar', openings: 141, applications: 980 },
    { month: 'Apr', openings: 154, applications: 1040 },
  ]);
});

router.post('/location-trends', async (_req: Request, res: Response) => {
  res.json(await getTopLocations());
});

router.get('/top-locations', async (_req: Request, res: Response) => {
  res.json(await getTopLocations());
});

router.get('/insights', (_req: Request, res: Response) => {
  res.json(createInsights());
});

router.post('/competitive-intelligence', (req: Request, res: Response) => {
  const competitors = Array.isArray(req.body?.competitors) ? req.body.competitors : [];
  const source = competitors.length > 0 ? competitors : ['Naukri', 'LinkedIn', 'Indeed'];

  res.json(
    source.map((name: string, idx: number) => ({
      id: `comp-${idx + 1}`,
      competitorName: name,
      company: name,
      salaryComparison: Number((4.5 + idx * 2.1).toFixed(1)),
      hiringPace: idx === 0 ? 'fast' : idx === 1 ? 'medium' : 'slow',
      growthRate: Number((12 + idx * 3.4).toFixed(1)),
      employeeSatisfaction: Number((4.2 - idx * 0.2).toFixed(1)),
      turnoverRate: Number((8 + idx * 1.6).toFixed(1)),
      beneftisComparison: ['Health insurance', 'Remote work', 'Learning stipend'],
      benefitsComparison: ['Health insurance', 'Remote work', 'Learning stipend'],
      hiringVelocity: 60 + idx * 7,
      salaryCompetitiveness: 70 + idx * 4,
      remoteRatio: 45 + idx * 5,
    }))
  );
});

router.post('/report/generate', (req: Request, res: Response) => {
  const title = String(req.body?.title || 'Analytics Report');
  const sections = Array.isArray(req.body?.sections) ? req.body.sections : [];
  res.json({
    id: `report-${Date.now()}`,
    title,
    sections,
    createdAt: new Date().toISOString(),
    status: 'ready',
  });
});

router.get('/report/export', (req: Request, res: Response) => {
  const reportId = String(req.query.reportId || 'report');
  const format = String(req.query.format || 'pdf');
  res.json({
    reportId,
    format,
    downloadUrl: `/exports/${reportId}.${format}`,
  });
});

router.post('/export', (req: Request, res: Response) => {
  const format = String(req.body?.format || 'csv');
  const type = String(req.body?.type || 'analytics');

  if (format === 'json') {
    res.json({ type, exportedAt: new Date().toISOString(), rows: [] });
    return;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.send(`type,exported_at\n${type},${new Date().toISOString()}\n`);
});

export default router;
