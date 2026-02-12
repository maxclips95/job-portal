'use client';

import React, { useEffect, useState } from 'react';
import { useCandidateStore } from '@/stores/candidateStore';
import {
  Upload,
  Edit2,
  Trash2,
  Plus,
  X,
} from 'lucide-react';

export default function CandidateProfilePage() {
  const {
    profile,
    profileLoading,
    profileError,
    education,
    educationLoading,
    experience,
    experienceLoading,
    editingEducationId,
    editingExperienceId,
    fetchProfile,
    updateProfile,
    uploadProfilePicture,
    fetchEducation,
    addEducation,
    updateEducation,
    deleteEducation,
    setEditingEducation,
    fetchExperience,
    addExperience,
    updateExperience,
    deleteExperience,
    setEditingExperience,
    addSkill,
    removeSkill,
  } = useCandidateStore();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [isAddingExperience, setIsAddingExperience] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const [profileForm, setProfileForm] = useState<Partial<any>>({});
  const [educationForm, setEducationForm] = useState<Partial<any>>({});
  const [experienceForm, setExperienceForm] = useState<Partial<any>>({});

  useEffect(() => {
    fetchProfile();
    fetchEducation();
    fetchExperience();
  }, [fetchProfile, fetchEducation, fetchExperience]);

  useEffect(() => {
    if (profile) {
      setProfileForm(profile);
    }
  }, [profile]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async () => {
    await updateProfile(profileForm);
    setIsEditingProfile(false);
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadProfilePicture(file);
    }
  };

  const handleAddEducation = async () => {
    await addEducation(educationForm);
    setEducationForm({});
    setIsAddingEducation(false);
  };

  const handleUpdateEducation = async (id: string) => {
    await updateEducation(id, educationForm);
    setEducationForm({});
    setEditingEducation(null);
  };

  const handleAddExperience = async () => {
    await addExperience(experienceForm);
    setExperienceForm({});
    setIsAddingExperience(false);
  };

  const handleUpdateExperience = async (id: string) => {
    await updateExperience(id, experienceForm);
    setExperienceForm({});
    setEditingExperience(null);
  };

  const handleAddSkill = async () => {
    if (skillInput.trim()) {
      await addSkill(skillInput.trim());
      setSkillInput('');
    }
  };

  if (profileLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700 mb-4">{profileError || 'Failed to load profile'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <img
                  src={profile.profilePicture || `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-200"
                />
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                  <Upload size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-gray-600 text-lg">{profile.headline}</p>
                <p className="text-gray-500">{profile.location}</p>
                <p className="text-gray-500">{profile.yearsOfExperience} years of experience</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit2 size={18} />
              {isEditingProfile ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {/* Profile Form */}
          {isEditingProfile && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={profileForm.firstName || ''}
                onChange={handleProfileChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={profileForm.lastName || ''}
                onChange={handleProfileChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={profileForm.email || ''}
                onChange={handleProfileChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={profileForm.phone || ''}
                onChange={handleProfileChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="location"
                placeholder="Location"
                value={profileForm.location || ''}
                onChange={handleProfileChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <input
                type="text"
                name="headline"
                placeholder="Professional Headline"
                value={profileForm.headline || ''}
                onChange={handleProfileChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <textarea
                name="bio"
                placeholder="Bio"
                value={profileForm.bio || ''}
                onChange={handleProfileChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2 h-24 resize-none"
              />
              <button
                onClick={handleProfileSubmit}
                disabled={profileLoading}
                className="col-span-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
              >
                {profileLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* Skills Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Skills</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.skills?.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkill(skill)}
                    className="hover:text-blue-900"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSkill();
                  }
                }}
                placeholder="Add a skill..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddSkill}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Education Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Education</h2>
            <button
              onClick={() => setIsAddingEducation(!isAddingEducation)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              {isAddingEducation ? 'Cancel' : 'Add'}
            </button>
          </div>

          {/* Add Education Form */}
          {isAddingEducation && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <input
                type="text"
                placeholder="Institution"
                value={educationForm.institution || ''}
                onChange={(e) =>
                  setEducationForm((prev) => ({ ...prev, institution: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <input
                type="text"
                placeholder="Degree"
                value={educationForm.degree || ''}
                onChange={(e) =>
                  setEducationForm((prev) => ({ ...prev, degree: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Field of Study"
                value={educationForm.fieldOfStudy || ''}
                onChange={(e) =>
                  setEducationForm((prev) => ({ ...prev, fieldOfStudy: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={educationForm.startDate || ''}
                onChange={(e) =>
                  setEducationForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={educationForm.endDate || ''}
                onChange={(e) =>
                  setEducationForm((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddEducation}
                disabled={educationLoading}
                className="col-span-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
              >
                {educationLoading ? 'Adding...' : 'Add Education'}
              </button>
            </div>
          )}

          {/* Education List */}
          <div className="space-y-4">
            {education.map((edu) => (
              <div
                key={edu.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
              >
                {editingEducationId === edu.id ? (
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Institution"
                      defaultValue={edu.institution}
                      onChange={(e) =>
                        setEducationForm((prev) => ({ ...prev, institution: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Degree"
                      defaultValue={edu.degree}
                      onChange={(e) =>
                        setEducationForm((prev) => ({ ...prev, degree: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Field of Study"
                      defaultValue={edu.fieldOfStudy}
                      onChange={(e) =>
                        setEducationForm((prev) => ({ ...prev, fieldOfStudy: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <div className="col-span-2 flex gap-2">
                      <button
                        onClick={() => handleUpdateEducation(edu.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingEducation(null)}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900">{edu.degree}</h4>
                      <p className="text-gray-600">{edu.institution}</p>
                      <p className="text-gray-500 text-sm">{edu.fieldOfStudy}</p>
                      <p className="text-gray-500 text-sm mt-2">
                        {new Date(edu.startDate).getFullYear()} -{' '}
                        {new Date(edu.endDate).getFullYear()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingEducation(edu.id);
                          setEducationForm(edu);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteEducation(edu.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Experience Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Work Experience</h2>
            <button
              onClick={() => setIsAddingExperience(!isAddingExperience)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              {isAddingExperience ? 'Cancel' : 'Add'}
            </button>
          </div>

          {/* Add Experience Form */}
          {isAddingExperience && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <input
                type="text"
                placeholder="Company"
                value={experienceForm.company || ''}
                onChange={(e) =>
                  setExperienceForm((prev) => ({ ...prev, company: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg col-span-2"
              />
              <input
                type="text"
                placeholder="Position"
                value={experienceForm.position || ''}
                onChange={(e) =>
                  setExperienceForm((prev) => ({ ...prev, position: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="date"
                value={experienceForm.startDate || ''}
                onChange={(e) =>
                  setExperienceForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                placeholder="Description"
                value={experienceForm.description || ''}
                onChange={(e) =>
                  setExperienceForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg col-span-2 h-20 resize-none"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={experienceForm.currentlyWorking || false}
                  onChange={(e) =>
                    setExperienceForm((prev) => ({
                      ...prev,
                      currentlyWorking: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                <span>Currently Working Here</span>
              </label>
              {!experienceForm.currentlyWorking && (
                <input
                  type="date"
                  value={experienceForm.endDate || ''}
                  onChange={(e) =>
                    setExperienceForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              )}
              <button
                onClick={handleAddExperience}
                disabled={experienceLoading}
                className="col-span-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
              >
                {experienceLoading ? 'Adding...' : 'Add Experience'}
              </button>
            </div>
          )}

          {/* Experience List */}
          <div className="space-y-4">
            {experience.map((exp) => (
              <div
                key={exp.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
              >
                {editingExperienceId === exp.id ? (
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Company"
                      defaultValue={exp.company}
                      onChange={(e) =>
                        setExperienceForm((prev) => ({ ...prev, company: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Position"
                      defaultValue={exp.position}
                      onChange={(e) =>
                        setExperienceForm((prev) => ({ ...prev, position: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="date"
                      defaultValue={exp.startDate || ''}
                      onChange={(e) =>
                        setExperienceForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <textarea
                      placeholder="Description"
                      defaultValue={exp.description}
                      onChange={(e) =>
                        setExperienceForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg col-span-2 h-20 resize-none"
                    />
                    <label className="flex items-center gap-2 col-span-2">
                      <input
                        type="checkbox"
                        defaultChecked={Boolean(exp.currentlyWorking)}
                        onChange={(e) =>
                          setExperienceForm((prev) => ({
                            ...prev,
                            currentlyWorking: e.target.checked,
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <span>Currently Working Here</span>
                    </label>
                    {!experienceForm.currentlyWorking && (
                      <input
                        type="date"
                        defaultValue={exp.endDate || ''}
                        onChange={(e) =>
                          setExperienceForm((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg col-span-2"
                      />
                    )}
                    <div className="col-span-2 flex gap-2">
                      <button
                        onClick={() => handleUpdateExperience(exp.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingExperience(null)}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{exp.position}</h4>
                      <p className="text-gray-600">{exp.company}</p>
                      <p className="text-gray-500 text-sm mt-1">{exp.description}</p>
                      <p className="text-gray-500 text-sm mt-2">
                        {new Date(exp.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                        })} -{' '}
                        {exp.currentlyWorking
                          ? 'Present'
                          : new Date(exp.endDate || '').toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                            })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingExperience(exp.id);
                          setExperienceForm(exp);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteExperience(exp.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
