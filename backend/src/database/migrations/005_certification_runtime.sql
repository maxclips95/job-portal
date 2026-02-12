CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS certification_assessments_runtime (
  id UUID PRIMARY KEY,
  skill_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  passing_score INTEGER NOT NULL DEFAULT 70,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certification_questions_runtime (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES certification_assessments_runtime(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  content TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS certification_attempts_runtime (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES certification_assessments_runtime(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in-progress',
  score NUMERIC(5,2),
  is_passed BOOLEAN,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS certification_certifications_runtime (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  level TEXT NOT NULL,
  earned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'earned',
  verification_token TEXT NOT NULL UNIQUE,
  credential_url TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_certification_unique_user_skill
ON certification_certifications_runtime (user_id, skill_id);

CREATE TABLE IF NOT EXISTS certification_portfolios_runtime (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Portfolio',
  bio TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certification_portfolio_items_runtime (
  id UUID PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES certification_portfolios_runtime(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  links JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certification_badges_runtime (
  id UUID PRIMARY KEY,
  skill_id TEXT NOT NULL UNIQUE,
  skill_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  level TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS certification_endorsements_runtime (
  id UUID PRIMARY KEY,
  endorsed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endorsed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'intermediate',
  message TEXT,
  endorsement_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certification_endorsements_user
ON certification_endorsements_runtime (endorsed_user_id, endorsement_date DESC);

INSERT INTO certification_assessments_runtime (
  id, skill_id, title, description, difficulty, duration_minutes, passing_score, status
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'react',
    'React Fundamentals',
    'Core React concepts including hooks, state, and rendering patterns.',
    'beginner',
    45,
    70,
    'published'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'typescript',
    'Advanced TypeScript',
    'Type narrowing, generics, and robust typing for production code.',
    'expert',
    60,
    75,
    'published'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'nodejs',
    'Node.js Backend',
    'API architecture, async patterns, and backend best practices.',
    'intermediate',
    50,
    70,
    'published'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO certification_questions_runtime (
  id, assessment_id, question_type, content, options, correct_answer, points, position
)
VALUES
  (
    '11111111-aaaa-1111-aaaa-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'multiple-choice',
    'What is the primary purpose of the useEffect hook?',
    '["To manage component state","To handle side effects in functional components","To optimize performance","To manage context"]'::jsonb,
    'To handle side effects in functional components',
    10,
    1
  ),
  (
    '11111111-bbbb-1111-bbbb-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'true-false',
    'TypeScript requires all variables to be explicitly typed.',
    '["True","False"]'::jsonb,
    'False',
    5,
    2
  ),
  (
    '22222222-aaaa-2222-aaaa-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'multiple-choice',
    'Which TypeScript feature allows a type to depend on another type parameter?',
    '["Enums","Decorators","Conditional Types","Namespaces"]'::jsonb,
    'Conditional Types',
    10,
    1
  ),
  (
    '33333333-aaaa-3333-aaaa-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'multiple-choice',
    'Which method should you use to handle async errors in Express route handlers?',
    '["try/catch with next(error)","process.on","window.onerror","setTimeout"]'::jsonb,
    'try/catch with next(error)',
    10,
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO certification_badges_runtime (
  id, skill_id, skill_name, name, description, icon, color, level
)
VALUES
  (
    'aaaa1111-1111-1111-1111-111111111111',
    'react',
    'React',
    'React Master',
    'Advanced React development skills',
    '⚛️',
    '#61DAFB',
    'professional'
  ),
  (
    'bbbb2222-2222-2222-2222-222222222222',
    'typescript',
    'TypeScript',
    'TypeScript Pro',
    'TypeScript mastery and advanced typing',
    '📘',
    '#3178C6',
    'expert'
  ),
  (
    'cccc3333-3333-3333-3333-333333333333',
    'nodejs',
    'Node.js',
    'Node.js Expert',
    'Backend development with Node.js',
    '🟢',
    '#68A063',
    'professional'
  )
ON CONFLICT (id) DO NOTHING;
