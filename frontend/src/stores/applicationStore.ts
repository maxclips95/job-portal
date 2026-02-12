import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import ApplicationService from '../services/application.service';

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

interface Statistics {
  total: number;
  pending: number;
  reviewed: number;
  shortlisted: number;
  rejected: number;
  accepted: number;
}

interface ApplicationState {
  // Applications
  applications: Application[];
  selectedApplication: Application | null;
  applicationLoading: boolean;
  applicationError: string | null;
  applicationTotal: number;

  // Interviews
  interviews: Interview[];
  interviewLoading: boolean;
  interviewError: string | null;

  // Offers
  offers: JobOffer[];
  offerLoading: boolean;
  offerError: string | null;

  // Statistics
  statistics: Statistics | null;
  statsLoading: boolean;

  // Actions
  fetchApplications: (filters?: any) => Promise<void>;
  fetchApplicationById: (id: string | number) => Promise<void>;
  applyForJob: (jobId: string | number, data: any) => Promise<void>;
  withdrawApplication: (id: string | number) => Promise<void>;
  
  fetchInterviews: () => Promise<void>;
  fetchInterviewById: (id: string | number) => Promise<void>;
  rescheduleInterview: (id: string | number, newDate: string) => Promise<void>;
  submitInterviewFeedback: (id: string | number, feedback: string) => Promise<void>;
  
  fetchOffers: () => Promise<void>;
  fetchOfferById: (id: string | number) => Promise<void>;
  acceptOffer: (id: string | number) => Promise<void>;
  rejectOffer: (id: string | number, reason?: string) => Promise<void>;
  
  fetchStatistics: () => Promise<void>;
  
  // State reset
  resetApplicationState: () => void;
}

export const useApplicationStore = create<ApplicationState>()(
  devtools((set, get) => ({
    // Initial state
    applications: [],
    selectedApplication: null,
    applicationLoading: false,
    applicationError: null,
    applicationTotal: 0,

    interviews: [],
    interviewLoading: false,
    interviewError: null,

    offers: [],
    offerLoading: false,
    offerError: null,

    statistics: null,
    statsLoading: false,

    // Fetch applications
    fetchApplications: async (filters = {}) => {
      set({ applicationLoading: true, applicationError: null });
      try {
        const result = await ApplicationService.getMyApplications(filters);
        set({
          applications: result.applications,
          applicationTotal: result.total,
          applicationLoading: false,
        });
      } catch (error) {
        set({
          applicationError:
            error instanceof Error ? error.message : 'Failed to fetch applications',
          applicationLoading: false,
        });
      }
    },

    // Fetch single application
    fetchApplicationById: async (id: string | number) => {
      set({ applicationLoading: true, applicationError: null });
      try {
        const application = await ApplicationService.getApplication(id);
        set({
          selectedApplication: application,
          applicationLoading: false,
        });
      } catch (error) {
        set({
          applicationError:
            error instanceof Error ? error.message : 'Failed to fetch application',
          applicationLoading: false,
        });
      }
    },

    // Apply for job
    applyForJob: async (jobId: string | number, data: any) => {
      set({ applicationLoading: true, applicationError: null });
      try {
        await ApplicationService.applyForJob(jobId, data);
        // Refresh applications list
        await get().fetchApplications();
        set({ applicationLoading: false });
      } catch (error) {
        set({
          applicationError:
            error instanceof Error ? error.message : 'Failed to apply for job',
          applicationLoading: false,
        });
      }
    },

    // Withdraw application
    withdrawApplication: async (id: string | number) => {
      set({ applicationLoading: true, applicationError: null });
      try {
        await ApplicationService.withdrawApplication(id);
        // Refresh applications list
        await get().fetchApplications();
        set({ applicationLoading: false });
      } catch (error) {
        set({
          applicationError:
            error instanceof Error ? error.message : 'Failed to withdraw application',
          applicationLoading: false,
        });
      }
    },

    // Fetch interviews
    fetchInterviews: async () => {
      set({ interviewLoading: true, interviewError: null });
      try {
        const interviews = await ApplicationService.getMyInterviews();
        set({
          interviews,
          interviewLoading: false,
        });
      } catch (error) {
        set({
          interviewError:
            error instanceof Error ? error.message : 'Failed to fetch interviews',
          interviewLoading: false,
        });
      }
    },

    // Fetch single interview
    fetchInterviewById: async (id: string | number) => {
      set({ interviewLoading: true, interviewError: null });
      try {
        await ApplicationService.getInterview(id);
        await get().fetchInterviews();
        set({ interviewLoading: false });
      } catch (error) {
        set({
          interviewError:
            error instanceof Error ? error.message : 'Failed to fetch interview',
          interviewLoading: false,
        });
      }
    },

    // Reschedule interview
    rescheduleInterview: async (id: string | number, newDate: string) => {
      set({ interviewLoading: true, interviewError: null });
      try {
        await ApplicationService.rescheduleInterview(id, newDate);
        await get().fetchInterviews();
        set({ interviewLoading: false });
      } catch (error) {
        set({
          interviewError:
            error instanceof Error ? error.message : 'Failed to reschedule interview',
          interviewLoading: false,
        });
      }
    },

    // Submit interview feedback
    submitInterviewFeedback: async (id: string | number, feedback: string) => {
      set({ interviewLoading: true, interviewError: null });
      try {
        await ApplicationService.submitInterviewFeedback(id, feedback);
        await get().fetchInterviews();
        set({ interviewLoading: false });
      } catch (error) {
        set({
          interviewError:
            error instanceof Error ? error.message : 'Failed to submit feedback',
          interviewLoading: false,
        });
      }
    },

    // Fetch offers
    fetchOffers: async () => {
      set({ offerLoading: true, offerError: null });
      try {
        const offers = await ApplicationService.getMyOffers();
        set({
          offers,
          offerLoading: false,
        });
      } catch (error) {
        set({
          offerError:
            error instanceof Error ? error.message : 'Failed to fetch offers',
          offerLoading: false,
        });
      }
    },

    // Fetch single offer
    fetchOfferById: async (id: string | number) => {
      set({ offerLoading: true, offerError: null });
      try {
        await ApplicationService.getOffer(id);
        await get().fetchOffers();
        set({ offerLoading: false });
      } catch (error) {
        set({
          offerError:
            error instanceof Error ? error.message : 'Failed to fetch offer',
          offerLoading: false,
        });
      }
    },

    // Accept offer
    acceptOffer: async (id: string | number) => {
      set({ offerLoading: true, offerError: null });
      try {
        await ApplicationService.acceptOffer(id);
        await get().fetchOffers();
        set({ offerLoading: false });
      } catch (error) {
        set({
          offerError:
            error instanceof Error ? error.message : 'Failed to accept offer',
          offerLoading: false,
        });
      }
    },

    // Reject offer
    rejectOffer: async (id: string | number, reason?: string) => {
      set({ offerLoading: true, offerError: null });
      try {
        await ApplicationService.rejectOffer(id, reason);
        await get().fetchOffers();
        set({ offerLoading: false });
      } catch (error) {
        set({
          offerError:
            error instanceof Error ? error.message : 'Failed to reject offer',
          offerLoading: false,
        });
      }
    },

    // Fetch statistics
    fetchStatistics: async () => {
      set({ statsLoading: true });
      try {
        const statistics = await ApplicationService.getStatistics();
        set({
          statistics,
          statsLoading: false,
        });
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
        set({ statsLoading: false });
      }
    },

    // Reset state
    resetApplicationState: () => {
      set({
        applications: [],
        selectedApplication: null,
        applicationLoading: false,
        applicationError: null,
        applicationTotal: 0,
        interviews: [],
        interviewLoading: false,
        interviewError: null,
        offers: [],
        offerLoading: false,
        offerError: null,
        statistics: null,
        statsLoading: false,
      });
    },
  }))
);
