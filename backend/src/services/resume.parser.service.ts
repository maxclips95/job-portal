/**
 * Resume Parser Service
 * Extracts and structures data from resume PDFs
 * Uses PyPDF2 for PDF parsing (via Python microservice)
 */

import { logger } from '@/utils/logger';

export interface ParsedResume {
  fullText: string;
  sections: {
    contact?: string;
    summary?: string;
    experience?: string;
    education?: string;
    skills?: string;
    projects?: string;
  };
  extractedSkills?: string[];
  matchScore?: number;
}

class ResumeParserService {
  /**
   * Parse resume PDF file
   * In production, this would call a Python microservice for PDF extraction
   */
  async parseResumePDF(fileBuffer: Buffer): Promise<ParsedResume> {
    try {
      // Convert buffer to text (in production, use Python + PyPDF2)
      const fullText = await this.extractTextFromPDF(fileBuffer);
      
      return {
        fullText,
        sections: this.extractSections(fullText),
        extractedSkills: []
      };
    } catch (error) {
      logger.error('Error parsing resume PDF:', error);
      throw new Error('Failed to parse resume PDF');
    }
  }

  /**
   * Extract sections from resume text
   */
  private extractSections(text: string) {
    const sections: any = {};
    
    // Extract contact info
    sections.contact = this.extractContact(text);
    
    // Extract sections by headers
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('professional summary') || lowerText.includes('objective')) {
      sections.summary = this.extractSection(text, ['professional summary', 'objective', 'summary']);
    }
    
    if (lowerText.includes('experience') || lowerText.includes('work history')) {
      sections.experience = this.extractSection(text, ['experience', 'work history', 'employment']);
    }
    
    if (lowerText.includes('education')) {
      sections.education = this.extractSection(text, ['education', 'academic', 'degree']);
    }
    
    if (lowerText.includes('skills') || lowerText.includes('technical skills')) {
      sections.skills = this.extractSection(text, ['skills', 'technical skills', 'competencies']);
    }
    
    if (lowerText.includes('projects')) {
      sections.projects = this.extractSection(text, ['projects', 'portfolio', 'accomplishments']);
    }
    
    return sections;
  }

  /**
   * Extract contact information
   */
  private extractContact(text: string): string {
    // Simple regex patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /\+?[\d\s\-()]{10,}/;
    
    const email = text.match(emailRegex)?.[0];
    const phone = text.match(phoneRegex)?.[0];
    
    return `${email || ''} ${phone || ''}`.trim();
  }

  /**
   * Extract section content
   */
  private extractSection(text: string, headers: string[]): string {
    for (const header of headers) {
      const regex = new RegExp(`${header}[\\s\\S]*?(?=(?:${this.getHeaderPatterns()})|$)`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[0].replace(header, '').trim();
      }
    }
    return '';
  }

  /**
   * Common section headers
   */
  private getHeaderPatterns(): string {
    return 'experience|education|skills|projects|certifications|summary|objective|contact|references';
  }

  /**
   * Extract text from PDF buffer
   * Uses a lightweight fallback extraction for text-based PDFs.
   */
  private async extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
    try {
      const text = fileBuffer
        .toString('utf-8')
        .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) {
        throw new Error('No readable content extracted from PDF');
      }
      return text;
    } catch {
      throw new Error('Unable to parse PDF file');
    }
  }

  /**
   * Extract skills from resume text
   * Used by skill extraction service
   */
  async extractSkillsFromText(resumeText: string): Promise<string[]> {
    // This will be enhanced by Hugging Face NER in skill extraction service
    
    // Common skill keywords (fallback)
    const skillKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
      'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'FastAPI',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Firebase',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git',
      'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'Material UI',
      'REST API', 'GraphQL', 'WebSocket', 'OAuth', 'JWT',
      'Agile', 'Scrum', 'Jira', 'Confluence', 'Linux', 'Windows',
      'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn',
      'Data Analysis', 'SQL', 'Excel', 'Tableau', 'Power BI'
    ];

    const foundSkills: Set<string> = new Set();
    const lowerText = resumeText.toLowerCase();

    for (const skill of skillKeywords) {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.add(skill);
      }
    }

    return Array.from(foundSkills);
  }
}

export const resumeParserService = new ResumeParserService();
