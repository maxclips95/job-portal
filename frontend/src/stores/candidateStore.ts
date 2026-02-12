import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import CandidateService from '../services/candidate.service';

interface CandidateProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  profilePicture?: string;
  headline?: string;
  yearsOfExperience: number;
  skills: string[];
  certifications?: string[];
}

interface Education {
  id: string;
  candidateId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade?: string;
  activities?: string;
}

interface Experience {
  id: string;
  candidateId: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  currentlyWorking: boolean;
}

interface CandidateState {
  // Profile
  profile: CandidateProfile | null;
  profileLoading: boolean;
  profileError: string | null;

  // Education
  education: Education[];
  educationLoading: boolean;
  educationError: string | null;

  // Experience
  experience: Experience[];
  experienceLoading: boolean;
  experienceError: string | null;

  // UI state
  editingEducationId: string | null;
  editingExperienceId: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<CandidateProfile>) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<void>;

  fetchEducation: () => Promise<void>;
  addEducation: (data: any) => Promise<void>;
  updateEducation: (id: string, data: any) => Promise<void>;
  deleteEducation: (id: string) => Promise<void>;
  setEditingEducation: (id: string | null) => void;

  fetchExperience: () => Promise<void>;
  addExperience: (data: any) => Promise<void>;
  updateExperience: (id: string, data: any) => Promise<void>;
  deleteExperience: (id: string) => Promise<void>;
  setEditingExperience: (id: string | null) => void;

  addSkill: (skill: string) => Promise<void>;
  removeSkill: (skill: string) => Promise<void>;

  getCandidateById: (id: string) => Promise<CandidateProfile>;

  // State reset
  resetCandidateState: () => void;
}

export const useCandidateStore = create<CandidateState>()(
  devtools((set, get) => ({
    // Initial state
    profile: null,
    profileLoading: false,
    profileError: null,

    education: [],
    educationLoading: false,
    educationError: null,

    experience: [],
    experienceLoading: false,
    experienceError: null,

    editingEducationId: null,
    editingExperienceId: null,

    // Fetch profile
    fetchProfile: async () => {
      set({ profileLoading: true, profileError: null });
      try {
        const profile = await CandidateService.getProfile();
        set({
          profile,
          profileLoading: false,
        });
      } catch (error) {
        set({
          profileError:
            error instanceof Error ? error.message : 'Failed to fetch profile',
          profileLoading: false,
        });
      }
    },

    // Update profile
    updateProfile: async (data: Partial<CandidateProfile>) => {
      set({ profileLoading: true, profileError: null });
      try {
        const profile = await CandidateService.updateProfile(data);
        set({
          profile,
          profileLoading: false,
        });
      } catch (error) {
        set({
          profileError:
            error instanceof Error ? error.message : 'Failed to update profile',
          profileLoading: false,
        });
      }
    },

    // Upload profile picture
    uploadProfilePicture: async (file: File) => {
      set({ profileLoading: true, profileError: null });
      try {
        const result = await CandidateService.uploadProfilePicture(file);
        const profile = get().profile;
        if (profile) {
          set({
            profile: { ...profile, profilePicture: result.url },
            profileLoading: false,
          });
        } else {
          set({ profileLoading: false });
        }
      } catch (error) {
        set({
          profileError:
            error instanceof Error
              ? error.message
              : 'Failed to upload profile picture',
          profileLoading: false,
        });
      }
    },

    // Fetch education
    fetchEducation: async () => {
      set({ educationLoading: true, educationError: null });
      try {
        const education = await CandidateService.getEducation();
        set({
          education,
          educationLoading: false,
        });
      } catch (error) {
        set({
          educationError:
            error instanceof Error ? error.message : 'Failed to fetch education',
          educationLoading: false,
        });
      }
    },

    // Add education
    addEducation: async (data: any) => {
      set({ educationLoading: true, educationError: null });
      try {
        await CandidateService.addEducation(data);
        await get().fetchEducation();
        set({ educationLoading: false });
      } catch (error) {
        set({
          educationError:
            error instanceof Error ? error.message : 'Failed to add education',
          educationLoading: false,
        });
      }
    },

    // Update education
    updateEducation: async (id: string, data: any) => {
      set({ educationLoading: true, educationError: null });
      try {
        await CandidateService.updateEducation(id, data);
        await get().fetchEducation();
        set({ educationLoading: false, editingEducationId: null });
      } catch (error) {
        set({
          educationError:
            error instanceof Error ? error.message : 'Failed to update education',
          educationLoading: false,
        });
      }
    },

    // Delete education
    deleteEducation: async (id: string) => {
      set({ educationLoading: true, educationError: null });
      try {
        await CandidateService.deleteEducation(id);
        await get().fetchEducation();
        set({ educationLoading: false });
      } catch (error) {
        set({
          educationError:
            error instanceof Error ? error.message : 'Failed to delete education',
          educationLoading: false,
        });
      }
    },

    // Set editing education ID
    setEditingEducation: (id: string | null) => {
      set({ editingEducationId: id });
    },

    // Fetch experience
    fetchExperience: async () => {
      set({ experienceLoading: true, experienceError: null });
      try {
        const experience = await CandidateService.getExperience();
        set({
          experience,
          experienceLoading: false,
        });
      } catch (error) {
        set({
          experienceError:
            error instanceof Error ? error.message : 'Failed to fetch experience',
          experienceLoading: false,
        });
      }
    },

    // Add experience
    addExperience: async (data: any) => {
      set({ experienceLoading: true, experienceError: null });
      try {
        await CandidateService.addExperience(data);
        await get().fetchExperience();
        set({ experienceLoading: false });
      } catch (error) {
        set({
          experienceError:
            error instanceof Error ? error.message : 'Failed to add experience',
          experienceLoading: false,
        });
      }
    },

    // Update experience
    updateExperience: async (id: string, data: any) => {
      set({ experienceLoading: true, experienceError: null });
      try {
        await CandidateService.updateExperience(id, data);
        await get().fetchExperience();
        set({ experienceLoading: false, editingExperienceId: null });
      } catch (error) {
        set({
          experienceError:
            error instanceof Error ? error.message : 'Failed to update experience',
          experienceLoading: false,
        });
      }
    },

    // Delete experience
    deleteExperience: async (id: string) => {
      set({ experienceLoading: true, experienceError: null });
      try {
        await CandidateService.deleteExperience(id);
        await get().fetchExperience();
        set({ experienceLoading: false });
      } catch (error) {
        set({
          experienceError:
            error instanceof Error ? error.message : 'Failed to delete experience',
          experienceLoading: false,
        });
      }
    },

    // Set editing experience ID
    setEditingExperience: (id: string | null) => {
      set({ editingExperienceId: id });
    },

    // Add skill
    addSkill: async (skill: string) => {
      try {
        await CandidateService.addSkill(skill);
        const profile = get().profile;
        if (profile && !profile.skills.includes(skill)) {
          set({
            profile: {
              ...profile,
              skills: [...profile.skills, skill],
            },
          });
        }
      } catch (error) {
        console.error('Failed to add skill:', error);
      }
    },

    // Remove skill
    removeSkill: async (skill: string) => {
      try {
        await CandidateService.removeSkill(skill);
        const profile = get().profile;
        if (profile) {
          set({
            profile: {
              ...profile,
              skills: profile.skills.filter((s) => s !== skill),
            },
          });
        }
      } catch (error) {
        console.error('Failed to remove skill:', error);
      }
    },

    // Get candidate by ID
    getCandidateById: async (id: string) => {
      try {
        return await CandidateService.getCandidateById(id);
      } catch (error) {
        console.error('Failed to fetch candidate:', error);
        throw error;
      }
    },

    // Reset state
    resetCandidateState: () => {
      set({
        profile: null,
        profileLoading: false,
        profileError: null,
        education: [],
        educationLoading: false,
        educationError: null,
        experience: [],
        experienceLoading: false,
        experienceError: null,
        editingEducationId: null,
        editingExperienceId: null,
      });
    },
  }))
);
