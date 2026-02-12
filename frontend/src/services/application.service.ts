import axios from 'axios';

interface Application {
  id: string | number;
  candidateId: string | number;
  jobId: string | number;
  status: 'applied' | 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted' | 'withdrawn';
  appliedDate: string;
  resume: string;
  coverLetter: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
}

interface Interview {
  id: string | number;
  applicationId: string | number;
  scheduledDate: string;
  interviewType: string;
  meetingLink?: string;
  interviewer?: string;
  feedback?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface JobOffer {
  id: string | number;
  applicationId: string | number;
  salary: number;
  startDate: string;
  position: string;
  companyName: string;
  benefits?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface ApplicationFilters {
  status?: string;
  jobId?: string | number;
  limit?: number;
  offset?: number;
}

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

class ApplicationService {
  private getAuthConfig() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    };
  }

  /**
   * Apply for a job
   */
  async applyForJob(jobId: number | string, data: {
    resumeUrl: string;
    coverLetter: string;
  }): Promise<Application> {
    try {
      const response = await axios.post(
        `${API_BASE}/applications/jobs/${jobId}/apply`,
        {
          coverLetter: data.coverLetter,
          resumeUrl: data.resumeUrl,
        },
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error applying for job:', error);
      throw error;
    }
  }

  /**
   * Get all applications for candidate
   */
  async getMyApplications(filters: ApplicationFilters = {}): Promise<{
    applications: Application[];
    total: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.jobId) params.append('jobId', filters.jobId.toString());
      const limit = filters.limit || 10;
      const offset = filters.offset || 0;
      const page = Math.floor(offset / limit) + 1;
      params.append('limit', limit.toString());
      params.append('page', page.toString());

      const response = await axios.get(
        `${API_BASE}/applications/my-applications?${params.toString()}`,
        this.getAuthConfig()
      );

      const payload = response.data?.data ?? response.data;
      const mapped = (payload.applications || []).map((item: any) => ({
        id: item.id,
        candidateId: item.candidate_id,
        jobId: item.job_id,
        status: item.status === 'applied' ? 'pending' : item.status,
        appliedDate: item.applied_at || item.created_at,
        resume: item.resume_url || '',
        coverLetter: item.cover_letter || '',
        jobTitle: item.job_title || '',
        companyName: item.company_name || '',
        location: [item.city, item.country].filter(Boolean).join(', '),
      }));
      return {
        applications: mapped,
        total: payload.pagination?.total || 0,
      };
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  }

  /**
   * Get application details
   */
  async getApplication(applicationId: number | string): Promise<Application> {
    try {
      const response = await axios.get(
        `${API_BASE}/applications/${applicationId}`,
        this.getAuthConfig()
      );

      const item = response.data?.data ?? response.data;
      return {
        id: item.id,
        candidateId: item.candidate_id,
        jobId: item.job_id,
        status: item.status === 'applied' ? 'pending' : item.status,
        appliedDate: item.applied_at || item.created_at,
        resume: item.resume_url || '',
        coverLetter: item.cover_letter || '',
        jobTitle: item.job_title || '',
        companyName: item.company_name || '',
        location: [item.city, item.country].filter(Boolean).join(', '),
      };
    } catch (error) {
      console.error('Error fetching application:', error);
      throw error;
    }
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(applicationId: number | string): Promise<{ message: string }> {
    try {
      const response = await axios.post(
        `${API_BASE}/applications/${applicationId}/withdraw`,
        {},
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error withdrawing application:', error);
      throw error;
    }
  }

  /**
   * Get interviews for candidate
   */
  async getMyInterviews(): Promise<Interview[]> {
    try {
      const response = await axios.get(
        `${API_BASE}/applications/my-interviews`,
        this.getAuthConfig()
      );
      const payload = response.data?.data ?? response.data;
      return (payload || []).map((item: any) => ({
        id: item.id,
        applicationId: item.application_id,
        scheduledDate: item.scheduled_at || item.created_at,
        interviewType: item.interview_type || 'video',
        meetingLink: item.interview_link || '',
        interviewer: item.company_name || '',
        feedback: item.feedback || '',
        status: item.status || 'scheduled',
      }));
    } catch (error) {
      console.error('Error fetching interviews:', error);
      throw error;
    }
  }

  /**
   * Get interview details
   */
  async getInterview(interviewId: number | string): Promise<Interview> {
    try {
      const response = await axios.get(
        `${API_BASE}/applications/interviews/${interviewId}`,
        this.getAuthConfig()
      );
      const item = response.data?.data ?? response.data;
      return {
        id: item.id,
        applicationId: item.application_id,
        scheduledDate: item.scheduled_at || item.created_at,
        interviewType: item.interview_type || 'video',
        meetingLink: item.interview_link || '',
        interviewer: item.company_name || '',
        feedback: item.feedback || '',
        status: item.status || 'scheduled',
      };
    } catch (error) {
      console.error('Error fetching interview:', error);
      throw error;
    }
  }

  /**
   * Reschedule interview
   */
  async rescheduleInterview(
    interviewId: number | string,
    newDate: string
  ): Promise<Interview> {
    try {
      const response = await axios.put(
        `${API_BASE}/applications/interviews/${interviewId}/reschedule`,
        { newDate },
        this.getAuthConfig()
      );
      const item = response.data?.data ?? response.data;
      return {
        id: item.id,
        applicationId: item.application_id,
        scheduledDate: item.scheduled_at || item.created_at,
        interviewType: item.interview_type || 'video',
        meetingLink: item.interview_link || '',
        interviewer: item.company_name || '',
        feedback: item.feedback || '',
        status: item.status || 'scheduled',
      };
    } catch (error) {
      console.error('Error rescheduling interview:', error);
      throw error;
    }
  }

  /**
   * Submit interview feedback
   */
  async submitInterviewFeedback(
    interviewId: number | string,
    feedback: string
  ): Promise<Interview> {
    try {
      const response = await axios.post(
        `${API_BASE}/applications/interviews/${interviewId}/feedback`,
        { feedback },
        this.getAuthConfig()
      );
      const item = response.data?.data ?? response.data;
      return {
        id: item.id,
        applicationId: item.application_id,
        scheduledDate: item.scheduled_at || item.created_at,
        interviewType: item.interview_type || 'video',
        meetingLink: item.interview_link || '',
        interviewer: item.company_name || '',
        feedback: item.feedback || '',
        status: item.status || 'scheduled',
      };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get job offers for candidate
   */
  async getMyOffers(): Promise<JobOffer[]> {
    try {
      const response = await axios.get(
        `${API_BASE}/applications/my-offers`,
        this.getAuthConfig()
      );
      const payload = response.data?.data ?? response.data;
      return (payload || []).map((item: any) => ({
        id: item.id,
        applicationId: item.application_id,
        salary: Number(item.salary || 0),
        startDate: item.start_date,
        position: item.position_title || '',
        companyName: item.company_name || '',
        benefits: item.benefits || '',
        status: item.status || 'pending',
      }));
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  }

  /**
   * Get offer details
   */
  async getOffer(offerId: number | string): Promise<JobOffer> {
    try {
      const response = await axios.get(
        `${API_BASE}/applications/my-offers/${offerId}`,
        this.getAuthConfig()
      );
      const item = response.data?.data ?? response.data;
      return {
        id: item.id,
        applicationId: item.application_id,
        salary: Number(item.salary || 0),
        startDate: item.start_date,
        position: item.position_title || '',
        companyName: item.company_name || '',
        benefits: item.benefits || '',
        status: item.status || 'pending',
      };
    } catch (error) {
      console.error('Error fetching offer:', error);
      throw error;
    }
  }

  /**
   * Accept job offer
   */
  async acceptOffer(offerId: number | string): Promise<{ message: string }> {
    try {
      const response = await axios.post(
        `${API_BASE}/applications/offers/${offerId}/accept`,
        {},
        this.getAuthConfig()
      );

      return { message: response.data?.message || 'Offer accepted' };
    } catch (error) {
      console.error('Error accepting offer:', error);
      throw error;
    }
  }

  /**
   * Reject job offer
   */
  async rejectOffer(offerId: number | string, reason?: string): Promise<{ message: string }> {
    try {
      const response = await axios.post(
        `${API_BASE}/applications/offers/${offerId}/reject`,
        { reason },
        this.getAuthConfig()
      );

      return { message: response.data?.message || 'Offer rejected' };
    } catch (error) {
      console.error('Error rejecting offer:', error);
      throw error;
    }
  }

  /**
   * Get application statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    reviewed: number;
    shortlisted: number;
    rejected: number;
    accepted: number;
  }> {
    try {
      const response = await axios.get(
        `${API_BASE}/applications/statistics`,
        this.getAuthConfig()
      );

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }
}

export default new ApplicationService();
