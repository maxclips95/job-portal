import { Router, Request, Response } from 'express';
import multer from 'multer';
import db from '@/config/database';
import { CandidateService } from '@/services/candidate.service';
import { authenticateToken } from '@/middleware/auth';

type CandidateProfileRow = {
  id: string;
  user_id: string;
  title?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  phone_number?: string | null;
  location?: string | null;
  years_of_experience?: number | null;
};

type UserRow = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

type EducationRow = {
  id: string;
  candidate_id: string;
  institution_name: string;
  degree: string;
  field_of_study?: string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  description?: string | null;
};

type ExperienceRow = {
  id: string;
  candidate_id: string;
  company_name: string;
  job_title: string;
  employment_type?: string | null;
  location?: string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  is_current?: boolean | null;
  description?: string | null;
};

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const candidateService = new CandidateService(db);

let schemaReady = false;

const toDateString = (value: Date | string | null | undefined): string => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const mapProfile = (profile: CandidateProfileRow, user: UserRow | null, skills: string[]) => ({
  id: profile.id,
  firstName: user?.first_name || '',
  lastName: user?.last_name || '',
  email: user?.email || '',
  phone: profile.phone_number || user?.phone || '',
  location: profile.location || '',
  bio: profile.bio || '',
  profilePicture: profile.profile_image_url || '',
  headline: profile.title || '',
  yearsOfExperience: profile.years_of_experience || 0,
  skills,
  certifications: [],
});

const mapEducation = (row: EducationRow) => ({
  id: row.id,
  candidateId: row.candidate_id,
  institution: row.institution_name,
  degree: row.degree,
  fieldOfStudy: row.field_of_study || '',
  startDate: toDateString(row.start_date),
  endDate: toDateString(row.end_date),
  activities: row.description || '',
});

const mapExperience = (row: ExperienceRow) => ({
  id: row.id,
  candidateId: row.candidate_id,
  company: row.company_name,
  position: row.job_title,
  startDate: toDateString(row.start_date),
  endDate: toDateString(row.end_date),
  description: row.description || '',
  currentlyWorking: Boolean(row.is_current),
});

const getAuthenticatedUserId = (req: Request): string | null => req.user?.userId || null;

const ensureCandidateSchema = async (): Promise<void> => {
  if (schemaReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS candidate_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      bio TEXT,
      profile_image_url VARCHAR(500),
      resume_url VARCHAR(255),
      phone_number VARCHAR(20),
      location VARCHAR(255),
      country VARCHAR(100),
      city VARCHAR(100),
      state VARCHAR(100),
      years_of_experience INTEGER DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'incomplete',
      visibility VARCHAR(50) NOT NULL DEFAULT 'private',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS resume_url VARCHAR(255)`);
  await db.query(`ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100)`);
  await db.query(`ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
  await db.query(`ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS state VARCHAR(100)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS candidate_education (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
      institution_name VARCHAR(255) NOT NULL,
      degree VARCHAR(100) NOT NULL,
      field_of_study VARCHAR(100),
      start_date DATE,
      end_date DATE,
      is_current BOOLEAN DEFAULT false,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS candidate_experience (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
      company_name VARCHAR(255) NOT NULL,
      job_title VARCHAR(255) NOT NULL,
      employment_type VARCHAR(50),
      location VARCHAR(255),
      start_date DATE NOT NULL,
      end_date DATE,
      is_current BOOLEAN DEFAULT false,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS candidate_skills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
      skill_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (candidate_id, skill_name)
    );
  `);

  schemaReady = true;
};

const getUserById = async (userId: string): Promise<UserRow | null> => {
  const result = await db.query(
    'SELECT id, email, first_name, last_name, phone FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  return (result.rows[0] as UserRow) || null;
};

const getProfileByUser = async (userId: string): Promise<CandidateProfileRow> => {
  await ensureCandidateSchema();
  const profile = await candidateService.getOrCreateProfile(userId);
  return profile as unknown as CandidateProfileRow;
};

const getSkills = async (candidateId: string): Promise<string[]> => {
  await ensureCandidateSchema();
  const result = await db.query(
    'SELECT skill_name FROM candidate_skills WHERE candidate_id = $1 ORDER BY created_at DESC',
    [candidateId]
  );
  return result.rows.map((row: { skill_name: string }) => row.skill_name);
};

router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const profile = await getProfileByUser(userId);
    const user = await getUserById(userId);
    const skills = await getSkills(profile.id);

    res.json(mapProfile(profile, user, skills));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch profile' });
  }
});

router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    await getProfileByUser(userId);

    const userFields: string[] = [];
    const userValues: string[] = [];

    if (typeof body.firstName === 'string') {
      userFields.push(`first_name = $${userValues.length + 1}`);
      userValues.push(body.firstName);
    }
    if (typeof body.lastName === 'string') {
      userFields.push(`last_name = $${userValues.length + 1}`);
      userValues.push(body.lastName);
    }
    if (typeof body.email === 'string') {
      userFields.push(`email = $${userValues.length + 1}`);
      userValues.push(body.email);
    }
    if (typeof body.phone === 'string') {
      userFields.push(`phone = $${userValues.length + 1}`);
      userValues.push(body.phone);
    }

    if (userFields.length > 0) {
      userValues.push(userId);
      await db.query(
        `UPDATE users SET ${userFields.join(', ')}, updated_at = NOW() WHERE id = $${userValues.length}`,
        userValues
      );
    }

    const profileUpdates: Record<string, unknown> = {};
    if (typeof body.headline === 'string') profileUpdates.title = body.headline;
    if (typeof body.bio === 'string') profileUpdates.bio = body.bio;
    if (typeof body.location === 'string') profileUpdates.location = body.location;
    if (typeof body.profilePicture === 'string') profileUpdates.profile_image_url = body.profilePicture;
    if (typeof body.phone === 'string') profileUpdates.phone_number = body.phone;
    if (typeof body.yearsOfExperience === 'number') {
      profileUpdates.years_of_experience = body.yearsOfExperience;
    }

    if (Object.keys(profileUpdates).length > 0) {
      await candidateService.updateProfile(userId, profileUpdates as any);
    }

    const profile = await getProfileByUser(userId);
    const user = await getUserById(userId);
    const skills = await getSkills(profile.id);

    res.json(mapProfile(profile, user, skills));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
  }
});

router.post('/profile-picture', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const imageUrl = `https://ui-avatars.com/api/?name=Candidate+Photo&background=random&size=256&t=${Date.now()}`;
    await candidateService.updateProfile(userId, { profile_image_url: imageUrl } as any);

    res.json({ url: imageUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to upload picture' });
  }
});

router.post('/education', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const profile = await getProfileByUser(userId);
    const body = req.body as Record<string, unknown>;

    const entry = await candidateService.addEducation(
      profile.id,
      String(body.institution || ''),
      String(body.degree || ''),
      String(body.fieldOfStudy || ''),
      new Date(String(body.startDate || new Date().toISOString())),
      body.endDate ? new Date(String(body.endDate)) : undefined,
      String(body.activities || body.description || '')
    );

    res.status(201).json(mapEducation(entry as unknown as EducationRow));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to add education' });
  }
});

router.get('/education', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const profile = await getProfileByUser(userId);
    const entries = await candidateService.getEducation(profile.id);

    res.json({
      education: (entries as unknown as EducationRow[]).map(mapEducation),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch education' });
  }
});

router.put('/education/:educationId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const updates: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown>;

    if (typeof body.institution === 'string') updates.institution_name = body.institution;
    if (typeof body.degree === 'string') updates.degree = body.degree;
    if (typeof body.fieldOfStudy === 'string') updates.field_of_study = body.fieldOfStudy;
    if (typeof body.activities === 'string') updates.description = body.activities;
    if (typeof body.startDate === 'string') updates.start_date = new Date(body.startDate);
    if (typeof body.endDate === 'string') updates.end_date = new Date(body.endDate);

    const entry = await candidateService.updateEducation(req.params.educationId, updates as any);
    res.json(mapEducation(entry as unknown as EducationRow));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update education' });
  }
});

router.delete('/education/:educationId', authenticateToken, async (req: Request, res: Response) => {
  try {
    await candidateService.deleteEducation(req.params.educationId);
    res.json({ message: 'Education deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete education' });
  }
});

router.post('/experience', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const profile = await getProfileByUser(userId);
    const body = req.body as Record<string, unknown>;

    const entry = await candidateService.addExperience(
      profile.id,
      String(body.company || ''),
      String(body.position || ''),
      String(body.employmentType || 'full_time'),
      String(body.location || ''),
      new Date(String(body.startDate || new Date().toISOString())),
      body.endDate ? new Date(String(body.endDate)) : undefined,
      String(body.description || '')
    );

    res.status(201).json(mapExperience(entry as unknown as ExperienceRow));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to add experience' });
  }
});

router.get('/experience', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const profile = await getProfileByUser(userId);
    const entries = await candidateService.getExperience(profile.id);

    res.json({
      experience: (entries as unknown as ExperienceRow[]).map(mapExperience),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch experience' });
  }
});

router.put('/experience/:experienceId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const updates: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown>;

    if (typeof body.company === 'string') updates.company_name = body.company;
    if (typeof body.position === 'string') updates.job_title = body.position;
    if (typeof body.description === 'string') updates.description = body.description;
    if (typeof body.location === 'string') updates.location = body.location;
    if (typeof body.employmentType === 'string') updates.employment_type = body.employmentType;
    if (typeof body.startDate === 'string') updates.start_date = new Date(body.startDate);
    if (typeof body.endDate === 'string') updates.end_date = new Date(body.endDate);
    if (typeof body.currentlyWorking === 'boolean') updates.is_current = body.currentlyWorking;

    const entry = await candidateService.updateExperience(req.params.experienceId, updates as any);
    res.json(mapExperience(entry as unknown as ExperienceRow));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update experience' });
  }
});

router.delete('/experience/:experienceId', authenticateToken, async (req: Request, res: Response) => {
  try {
    await candidateService.deleteExperience(req.params.experienceId);
    res.json({ message: 'Experience deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete experience' });
  }
});

router.post('/skills', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const profile = await getProfileByUser(userId);
    const skill = String((req.body as { skill?: string }).skill || '').trim();

    if (!skill) {
      res.status(400).json({ success: false, message: 'Skill is required' });
      return;
    }

    await db.query(
      'INSERT INTO candidate_skills (candidate_id, skill_name) VALUES ($1, $2) ON CONFLICT (candidate_id, skill_name) DO NOTHING',
      [profile.id, skill]
    );

    const skills = await getSkills(profile.id);
    res.json({ skills });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to add skill' });
  }
});

router.delete('/skills/:skill', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const profile = await getProfileByUser(userId);
    await db.query(
      'DELETE FROM candidate_skills WHERE candidate_id = $1 AND skill_name = $2',
      [profile.id, req.params.skill]
    );

    const skills = await getSkills(profile.id);
    res.json({ skills });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to remove skill' });
  }
});

router.get('/:candidateId', authenticateToken, async (req: Request, res: Response) => {
  try {
    await ensureCandidateSchema();
    const details = await candidateService.getCandidateDetails(req.params.candidateId);
    const profile = details.profile as CandidateProfileRow;
    const user = await getUserById(profile.user_id);
    const skills = await getSkills(profile.id);

    res.json({
      ...mapProfile(profile, user, skills),
      education: (details.education as EducationRow[]).map(mapEducation),
      experience: (details.experience as ExperienceRow[]).map(mapExperience),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch candidate' });
  }
});

export default router;
