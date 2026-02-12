/**
 * Assessment Service
 * Handles assessment creation, management, and attempt tracking
 */

import { Redis } from 'ioredis';
import {
  Assessment,
  AssessmentQuestion,
  AssessmentAttempt,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentResult,
  AssessmentFilter,
  PaginatedResponse,
  AssessmentStatus,
  QuestionType,
} from '../types/certification.types';

export interface IAssessmentService {
  createAssessment(
    request: CreateAssessmentRequest
  ): Promise<Assessment>;
  updateAssessment(
    assessmentId: string,
    request: UpdateAssessmentRequest
  ): Promise<Assessment>;
  getAssessment(assessmentId: string): Promise<Assessment>;
  listAssessments(
    filter: Partial<AssessmentFilter>
  ): Promise<PaginatedResponse<Assessment>>;
  deleteAssessment(assessmentId: string): Promise<void>;
  addQuestion(
    assessmentId: string,
    question: AssessmentQuestion
  ): Promise<AssessmentQuestion>;
  removeQuestion(
    assessmentId: string,
    questionId: string
  ): Promise<void>;
  startAttempt(
    assessmentId: string,
    userId: string
  ): Promise<AssessmentAttempt>;
  submitAttempt(
    attemptId: string,
    answers: Record<string, string>
  ): Promise<AssessmentResult>;
  getAttempt(attemptId: string): Promise<AssessmentAttempt>;
  getUserAttempts(userId: string): Promise<AssessmentAttempt[]>;
  calculateScore(
    attemptId: string,
    answers: Record<string, string>
  ): Promise<number>;
}

export class AssessmentService implements IAssessmentService {
  constructor(private db: any, private redis: Redis) {}

  async createAssessment(
    request: CreateAssessmentRequest
  ): Promise<Assessment> {
    const assessment: Assessment = {
      id: this.generateId(),
      skillId: request.skillId,
      title: request.title,
      description: request.description,
      difficulty: request.difficulty,
      format: request.format,
      durationMinutes: request.durationMinutes,
      passingScore: request.passingScore,
      totalQuestions: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft' as AssessmentStatus,
      creator: '', // Set by controller
      metadata: request.metadata || {},
    };

    await this.db.query(
      `INSERT INTO assessments 
      (id, skill_id, title, description, difficulty, format, duration_minutes, 
       passing_score, status, creator, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        assessment.id,
        assessment.skillId,
        assessment.title,
        assessment.description,
        assessment.difficulty,
        assessment.format,
        assessment.durationMinutes,
        assessment.passingScore,
        assessment.status,
        assessment.creator,
        JSON.stringify(assessment.metadata),
        assessment.createdAt,
        assessment.updatedAt,
      ]
    );

    return assessment;
  }

  async updateAssessment(
    assessmentId: string,
    request: UpdateAssessmentRequest
  ): Promise<Assessment> {
    const assessment = await this.getAssessment(assessmentId);
    const updated = { ...assessment, ...request, updatedAt: new Date() };

    await this.db.query(
      `UPDATE assessments SET 
      title = $1, description = $2, difficulty = $3, format = $4, 
      duration_minutes = $5, passing_score = $6, status = $7, metadata = $8, updated_at = $9
      WHERE id = $10`,
      [
        updated.title,
        updated.description,
        updated.difficulty,
        updated.format,
        updated.durationMinutes,
        updated.passingScore,
        updated.status,
        JSON.stringify(updated.metadata),
        updated.updatedAt,
        assessmentId,
      ]
    );

    await this.invalidateCache(`assessment:${assessmentId}`);
    return updated;
  }

  async getAssessment(assessmentId: string): Promise<Assessment> {
    const cached = await this.redis.get(`assessment:${assessmentId}`);
    if (cached) return JSON.parse(cached);

    const result = await this.db.query(
      'SELECT * FROM assessments WHERE id = $1',
      [assessmentId]
    );

    if (result.rows.length === 0) {
      throw new Error('Assessment not found');
    }

    const assessment = this.mapAssessment(result.rows[0]);
    await this.redis.setex(
      `assessment:${assessmentId}`,
      3600,
      JSON.stringify(assessment)
    );

    return assessment;
  }

  async listAssessments(
    filter: Partial<AssessmentFilter>
  ): Promise<PaginatedResponse<Assessment>> {
    const limit = filter.limit || 20;
    const page = filter.page || 1;
    const offset = (page - 1) * limit;

    let query =
      'SELECT * FROM assessments WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.skillId) {
      query += ` AND skill_id = $${paramIndex++}`;
      params.push(filter.skillId);
    }

    if (filter.difficulty) {
      query += ` AND difficulty = $${paramIndex++}`;
      params.push(filter.difficulty);
    }

    if (filter.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filter.status);
    }

    // Get total count
    const countResult = await this.db.query(
      query.replace('SELECT *', 'SELECT COUNT(*) as count'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    const assessments = result.rows.map((row: any) =>
      this.mapAssessment(row)
    );

    return {
      data: assessments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deleteAssessment(assessmentId: string): Promise<void> {
    await this.db.query('DELETE FROM assessments WHERE id = $1', [
      assessmentId,
    ]);
    await this.invalidateCache(`assessment:${assessmentId}`);
  }

  async addQuestion(
    assessmentId: string,
    question: AssessmentQuestion
  ): Promise<AssessmentQuestion> {
    const id = this.generateId();
    const questionData: AssessmentQuestion = {
      ...question,
      id,
      assessmentId,
    };

    await this.db.query(
      `INSERT INTO assessment_questions 
      (id, assessment_id, type, content, options, correct_answer, points, time_limit, explanation, \`order\`)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        assessmentId,
        question.type,
        question.content,
        JSON.stringify(question.options || []),
        question.correctAnswer,
        question.points,
        question.timeLimit,
        question.explanation,
        question.order,
      ]
    );

    // Increment question count
    await this.db.query(
      'UPDATE assessments SET total_questions = total_questions + 1 WHERE id = $1',
      [assessmentId]
    );

    await this.invalidateCache(`assessment:${assessmentId}`);
    return questionData;
  }

  async removeQuestion(
    assessmentId: string,
    questionId: string
  ): Promise<void> {
    await this.db.query(
      'DELETE FROM assessment_questions WHERE id = $1 AND assessment_id = $2',
      [questionId, assessmentId]
    );

    await this.db.query(
      'UPDATE assessments SET total_questions = total_questions - 1 WHERE id = $1',
      [assessmentId]
    );

    await this.invalidateCache(`assessment:${assessmentId}`);
  }

  async startAttempt(
    assessmentId: string,
    userId: string
  ): Promise<AssessmentAttempt> {
    const assessment = await this.getAssessment(assessmentId);

    const attempt: AssessmentAttempt = {
      id: this.generateId(),
      assessmentId,
      userId,
      startedAt: new Date(),
      status: 'in-progress',
      answers: {},
    };

    await this.db.query(
      `INSERT INTO assessment_attempts 
      (id, assessment_id, user_id, started_at, status, answers)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        attempt.id,
        assessmentId,
        userId,
        attempt.startedAt,
        attempt.status,
        JSON.stringify(attempt.answers),
      ]
    );

    await this.redis.setex(
      `attempt:${attempt.id}`,
      3600,
      JSON.stringify(attempt)
    );

    return attempt;
  }

  async submitAttempt(
    attemptId: string,
    answers: Record<string, string>
  ): Promise<AssessmentResult> {
    const attempt = await this.getAttempt(attemptId);
    const score = await this.calculateScore(attemptId, answers);

    const assessment = await this.getAssessment(attempt.assessmentId);
    const isPassed = score >= assessment.passingScore;
    const timeSpent = Math.floor(
      (Date.now() - attempt.startedAt.getTime()) / 1000
    );

    const completedAt = new Date();

    await this.db.query(
      `UPDATE assessment_attempts 
      SET status = $1, completed_at = $2, score = $3, answers = $4, time_spent = $5
      WHERE id = $6`,
      [
        'completed',
        completedAt,
        score,
        JSON.stringify(answers),
        timeSpent,
        attemptId,
      ]
    );

    const percentageScore = (score / 100) * 100;

    const result: AssessmentResult = {
      attemptId,
      score,
      percentageScore,
      isPassed,
      timeSpent,
      feedback: this.generateFeedback(
        isPassed,
        percentageScore,
        assessment.difficulty
      ),
      recommendations: this.generateRecommendations(
        isPassed,
        percentageScore
      ),
    };

    await this.invalidateCache(`attempt:${attemptId}`);
    return result;
  }

  async getAttempt(attemptId: string): Promise<AssessmentAttempt> {
    const cached = await this.redis.get(`attempt:${attemptId}`);
    if (cached) return JSON.parse(cached);

    const result = await this.db.query(
      'SELECT * FROM assessment_attempts WHERE id = $1',
      [attemptId]
    );

    if (result.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    const attempt = this.mapAttempt(result.rows[0]);
    await this.redis.setex(
      `attempt:${attemptId}`,
      3600,
      JSON.stringify(attempt)
    );

    return attempt;
  }

  async getUserAttempts(userId: string): Promise<AssessmentAttempt[]> {
    const result = await this.db.query(
      'SELECT * FROM assessment_attempts WHERE user_id = $1 ORDER BY started_at DESC',
      [userId]
    );

    return result.rows.map((row: any) => this.mapAttempt(row));
  }

  async calculateScore(
    attemptId: string,
    answers: Record<string, string>
  ): Promise<number> {
    const attempt = await this.getAttempt(attemptId);
    const questionsResult = await this.db.query(
      'SELECT * FROM assessment_questions WHERE assessment_id = $1',
      [attempt.assessmentId]
    );

    let totalScore = 0;
    let maxScore = 0;

    for (const row of questionsResult.rows) {
      const question = row;
      maxScore += question.points;

      if (answers[question.id] === question.correct_answer) {
        totalScore += question.points;
      }
    }

    return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  }

  private generateFeedback(
    isPassed: boolean,
    score: number,
    difficulty: string
  ): string {
    if (isPassed) {
      if (score >= 90) return 'Excellent performance! You have mastered this skill.';
      if (score >= 80) return 'Great work! You have a strong understanding of this topic.';
      return 'Good job! You passed the assessment.';
    }

    if (score >= 60) return 'Close! Review the failed topics and try again.';
    return 'You need more practice. Consider taking the tutorial before retrying.';
  }

  private generateRecommendations(isPassed: boolean, score: number): string[] {
    const recommendations: string[] = [];

    if (!isPassed) {
      recommendations.push('Review the course materials for failed topics');
      recommendations.push('Practice more exercises on weak areas');
      if (score < 50) {
        recommendations.push(
          'Consider taking the beginner level course first'
        );
      }
    } else if (score < 85) {
      recommendations.push('Review topics you answered incorrectly');
    } else {
      recommendations.push('Consider taking the next difficulty level');
      recommendations.push('Explore related certifications');
    }

    return recommendations;
  }

  private mapAssessment(row: any): Assessment {
    return {
      id: row.id,
      skillId: row.skill_id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      format: row.format,
      durationMinutes: row.duration_minutes,
      passingScore: row.passing_score,
      totalQuestions: row.total_questions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      creator: row.creator,
      metadata: row.metadata,
    };
  }

  private mapAttempt(row: any): AssessmentAttempt {
    return {
      id: row.id,
      assessmentId: row.assessment_id,
      userId: row.user_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      score: row.score,
      answers: row.answers,
      timeSpent: row.time_spent,
      percentageScore: row.score,
      isPassed: row.score >= 60,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async invalidateCache(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
