/**
 * Groq AI Service
 * Handles all Groq API calls for interview questions and content generation
 * Free tier: 30K tokens/min, scales to millions for minimal cost
 */

import { logger } from '@/utils/logger';

interface GroqMessage {
  role: 'user' | 'assistant';
  content: string;
}

class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private model = 'mixtral-8x7b-32768'; // Fast free model

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('GROQ_API_KEY not set. Groq features will be unavailable.');
    }
  }

  /**
   * Generate interview questions for a job
   */
  async generateInterviewQuestions(jobTitle: string, jobDescription: string): Promise<string[]> {
    try {
      if (!this.apiKey) {
        logger.error('Groq API key not configured');
        return this.getDefaultQuestions(jobTitle);
      }

      const prompt = `Generate 5 specific and challenging interview questions for a ${jobTitle} position.
      
Job Description: ${jobDescription}

Format as a JSON array of questions like: ["Question 1?", "Question 2?", ...]
Return ONLY the JSON array, no other text.`;

      const response = await this.callGroqAPI(prompt);
      
      try {
        const questions = JSON.parse(response);
        return Array.isArray(questions) ? questions : this.getDefaultQuestions(jobTitle);
      } catch {
        logger.error('Failed to parse interview questions response');
        return this.getDefaultQuestions(jobTitle);
      }
    } catch (error) {
      logger.error('Error generating interview questions:', error);
      return this.getDefaultQuestions(jobTitle);
    }
  }

  /**
   * Generate cover letter for a job
   */
  async generateCoverLetter(
    candidateName: string,
    jobTitle: string,
    companyName: string,
    skills: string[]
  ): Promise<string> {
    try {
      if (!this.apiKey) {
        return 'Unable to generate cover letter. Groq API not configured.';
      }

      const prompt = `Write a professional cover letter for:
      - Candidate: ${candidateName}
      - Position: ${jobTitle} at ${companyName}
      - Skills: ${skills.join(', ')}

Keep it concise, professional, and 3-4 paragraphs. Focus on how their skills match the role.`;

      return await this.callGroqAPI(prompt);
    } catch (error) {
      logger.error('Error generating cover letter:', error);
      return 'Unable to generate cover letter at this time.';
    }
  }

  /**
   * Analyze resume content
   */
  async analyzeResumeContent(resumeText: string): Promise<{
    summary: string;
    strengths: string[];
    improvements: string[];
  }> {
    try {
      if (!this.apiKey) {
        return {
          summary: 'Analysis unavailable',
          strengths: [],
          improvements: []
        };
      }

      const prompt = `Analyze this resume and provide:
1. A brief 2-sentence summary of the candidate's profile
2. Top 3 strengths
3. Top 3 areas for improvement

Resume:
${resumeText}

Return as JSON with keys: "summary", "strengths" (array), "improvements" (array)
Return ONLY valid JSON, no other text.`;

      const response = await this.callGroqAPI(prompt);
      
      try {
        return JSON.parse(response);
      } catch {
        return {
          summary: 'Unable to analyze resume',
          strengths: [],
          improvements: []
        };
      }
    } catch (error) {
      logger.error('Error analyzing resume:', error);
      return {
        summary: 'Analysis failed',
        strengths: [],
        improvements: []
      };
    }
  }

  /**
   * Get skill development recommendations
   */
  async getSkillRecommendations(currentSkills: string[], targetJobTitle: string): Promise<string[]> {
    try {
      if (!this.apiKey) {
        return [];
      }

      const prompt = `For a ${targetJobTitle} position, suggest 5 skills the candidate should develop or improve.
Current skills: ${currentSkills.join(', ')}

Format as JSON array: ["Skill 1", "Skill 2", ...]
Return ONLY the JSON array.`;

      const response = await this.callGroqAPI(prompt);
      
      try {
        const recommendations = JSON.parse(response);
        return Array.isArray(recommendations) ? recommendations : [];
      } catch {
        return [];
      }
    } catch (error) {
      logger.error('Error getting skill recommendations:', error);
      return [];
    }
  }

  /**
   * Call Groq API
   */
  private async callGroqAPI(prompt: string): Promise<string> {
    const messages: GroqMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const data: any = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Fallback default questions when API is unavailable
   */
  private getDefaultQuestions(jobTitle: string): string[] {
    return [
      `What is your experience with the technologies used in a ${jobTitle} role?`,
      `How do you approach solving complex problems in ${jobTitle.toLowerCase()}?`,
      `Can you describe a project where you successfully fulfilled ${jobTitle.toLowerCase()} responsibilities?`,
      `How do you stay updated with industry trends in ${jobTitle.toLowerCase()}?`,
      `What is your biggest strength as a ${jobTitle.toLowerCase()}?`
    ];
  }
}

export const groqService = new GroqService();
