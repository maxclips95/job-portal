'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin, Briefcase, DollarSign, Clock, Trash2 } from 'lucide-react';

interface JobCardProps {
  id: number;
  title: string;
  company: string;
  location: string;
  jobType: string;
  salaryMin: number;
  salaryMax: number;
  experience: string;
  category: string;
  postedDate: string;
  deadline: string;
  isSaved?: boolean;
  isApplied?: boolean;
  onSave?: (jobId: number) => void;
  onUnsave?: (jobId: number) => void;
  onRemove?: (jobId: number) => void;
  showRemoveButton?: boolean;
}

export default function JobCard({
  id,
  title,
  company,
  location,
  jobType,
  salaryMin,
  salaryMax,
  experience,
  category,
  postedDate,
  deadline,
  isSaved = false,
  isApplied = false,
  onSave,
  onUnsave,
  onRemove,
  showRemoveButton = false,
}: JobCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [loading, setLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (saved) {
        onUnsave?.(id);
      } else {
        onSave?.(id);
      }
      setSaved(!saved);
    } catch (error) {
      console.error('Error updating saved status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setRemoveLoading(true);

    try {
      onRemove?.(id);
    } catch (error) {
      console.error('Error removing job:', error);
    } finally {
      setRemoveLoading(false);
    }
  };

  return (
    <Link href={`/job/${id}`}>
      <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 p-6 cursor-pointer">
        {/* Header with Title and Save Button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600 mb-1">
              {title}
            </h3>
            <p className="text-gray-600 font-medium">{company}</p>
          </div>

          {/* Save/Unsave Button */}
          <button
            onClick={handleSaveClick}
            disabled={loading}
            className="ml-4 flex-shrink-0 disabled:opacity-50"
          >
            <Heart
              size={24}
              className={`transition-colors duration-200 ${
                saved
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-400 hover:text-red-500'
              }`}
            />
          </button>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
            {category}
          </span>
          <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
            {jobType}
          </span>
          {isApplied && (
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">
              Applied
            </span>
          )}
        </div>

        {/* Job Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center text-gray-600 text-sm">
            <MapPin size={16} className="mr-2 text-gray-400" />
            <span>{location}</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <DollarSign size={16} className="mr-2 text-gray-400" />
            <span>
              ${salaryMin?.toLocaleString()} - ${salaryMax?.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <Briefcase size={16} className="mr-2 text-gray-400" />
            <span>{experience}+ years</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <Clock size={16} className="mr-2 text-gray-400" />
            <span>Posted {formatDate(postedDate)}</span>
          </div>
        </div>

        {/* Deadline Info */}
        <div className="mb-4 p-2 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-xs text-yellow-700">
            <strong>Deadline:</strong> {formatDate(deadline)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              // Navigate to job details
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
          >
            View Details
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Navigate to apply page
            }}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200"
          >
            Apply Now
          </button>

          {/* Remove Button (for saved jobs list) */}
          {showRemoveButton && (
            <button
              onClick={handleRemoveClick}
              disabled={removeLoading}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 size={18} />
              {removeLoading ? 'Removing...' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
