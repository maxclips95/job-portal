'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jobService } from '@/services/job.service';

type Category = {
  id: string;
  name: string;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
};

type JobFormData = {
  title: string;
  description: string;
  requirements: string[];
  job_type: string;
  category_id: string;
  subcategory_id: string;
  company_name: string;
  country: string;
  city: string;
  is_remote: boolean;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  experience_level: string;
  deadline: string;
  is_urgent: boolean;
};

const initialFormData: JobFormData = {
  title: '',
  description: '',
  requirements: [],
  job_type: 'full_time',
  category_id: '',
  subcategory_id: '',
  company_name: '',
  country: '',
  city: '',
  is_remote: false,
  salary_min: 0,
  salary_max: 0,
  salary_currency: 'USD',
  experience_level: 'entry',
  deadline: '',
  is_urgent: false,
};

export default function PostJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [requirementInput, setRequirementInput] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      formData.title.trim().length > 0 &&
      formData.description.trim().length > 0 &&
      formData.category_id.length > 0 &&
      formData.subcategory_id.length > 0 &&
      formData.company_name.trim().length > 0 &&
      formData.country.trim().length > 0 &&
      formData.city.trim().length > 0 &&
      formData.deadline.length > 0 &&
      formData.salary_max >= formData.salary_min
    );
  }, [formData]);

  useEffect(() => {
    const loadInitial = async () => {
      setBootLoading(true);
      setError(null);
      try {
        const categoryData = await jobService.getCategories();
        setCategories(categoryData);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || 'Failed to load categories');
      } finally {
        setBootLoading(false);
      }
    };

    loadInitial();
  }, []);

  useEffect(() => {
    const loadSubcategories = async () => {
      if (!formData.category_id) {
        setSubcategories([]);
        return;
      }

      try {
        const data = await jobService.getSubcategories(formData.category_id);
        setSubcategories(data);

        if (data.length > 0 && !data.some((item) => item.id === formData.subcategory_id)) {
          setFormData((prev) => ({ ...prev, subcategory_id: data[0].id }));
        }
      } catch {
        setSubcategories([]);
      }
    };

    loadSubcategories();
  }, [formData.category_id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const inputElement = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: inputElement.checked }));
      return;
    }

    if (name === 'category_id') {
      setFormData((prev) => ({ ...prev, category_id: value, subcategory_id: '' }));
      return;
    }

    if (name === 'salary_min' || name === 'salary_max') {
      setFormData((prev) => ({ ...prev, [name]: Number(value || 0) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRequirement = () => {
    const trimmed = requirementInput.trim();
    if (!trimmed) return;

    setFormData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, trimmed],
    }));
    setRequirementInput('');
  };

  const handleRemoveRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError('Please complete all required fields before submitting.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await jobService.createJob(formData);
      setSuccess(true);
      setTimeout(() => {
        router.push('/employer/jobs');
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading form...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/employer/jobs" className="text-blue-600 hover:underline">
            Back to My Jobs
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Post a New Job</h1>
          <p className="text-gray-600 mb-6">Create a new listing for candidates.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              Job created successfully. Redirecting to employer jobs...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Type *</label>
                <select
                  name="job_type"
                  value={formData.job_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level *</label>
                <select
                  name="experience_level"
                  value={formData.experience_level}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory *</label>
                <select
                  name="subcategory_id"
                  value={formData.subcategory_id}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.category_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Select subcategory</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={6}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Add requirement"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRequirement();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddRequirement}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {formData.requirements.map((requirement, index) => (
                  <div key={`${requirement}-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span>{requirement}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(index)}
                      className="text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Salary Min</label>
                <input
                  type="number"
                  name="salary_min"
                  value={formData.salary_min}
                  onChange={handleInputChange}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Salary Max</label>
                <input
                  type="number"
                  name="salary_max"
                  value={formData.salary_max}
                  onChange={handleInputChange}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <input
                  type="text"
                  name="salary_currency"
                  value={formData.salary_currency}
                  onChange={handleInputChange}
                  maxLength={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Application Deadline *</label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_remote"
                  checked={formData.is_remote}
                  onChange={handleInputChange}
                />
                <span className="text-gray-700">Remote position</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_urgent"
                  checked={formData.is_urgent}
                  onChange={handleInputChange}
                />
                <span className="text-gray-700">Mark as urgent</span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Post Job'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
