'use client';

/**
 * ScreeningUpload Component
 * Handles bulk resume upload with drag-drop, validation, and progress tracking
 * Features:
 * - Drag and drop zone
 * - File input button
 * - File list with removal
 * - Progress bar during upload
 * - Error/success messages
 * - Job ID selection
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { screeningService } from '@/services/screening/screeningService';
import type { ScreeningJobResponse } from '@/services/screening/screeningService';

interface SelectedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
}

interface ScreeningUploadProps {
  onUploadComplete?: (job: ScreeningJobResponse) => void;
  onError?: (error: string) => void;
  availableJobs?: Array<{ id: string; title: string }>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 500;
const ALLOWED_TYPES = ['application/pdf'];

export function ScreeningUpload({
  onUploadComplete,
  onError,
  availableJobs = [],
}: ScreeningUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragZoneRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(availableJobs[0]?.id || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Progress listener
  useEffect(() => {
    const handleProgress = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.progress) {
        setUploadProgress(customEvent.detail.progress);
      }
    };

    window.addEventListener('screening-upload-progress', handleProgress);
    return () => window.removeEventListener('screening-upload-progress', handleProgress);
  }, []);

  // Validation helpers
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name} is not a PDF file. Only PDFs are allowed.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      return `${file.name} exceeds ${sizeMB}MB size limit.`;
    }

    return null;
  };

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    // Check total count
    if (selectedFiles.length + files.length > MAX_FILES) {
      validationErrors.push(
        `Cannot exceed ${MAX_FILES} files. You are trying to add ${files.length} file(s), but already have ${selectedFiles.length}.`
      );
    }

    // Check each file
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        // Check for duplicates
        const isDuplicate = selectedFiles.some((sf) => sf.file.name === file.name);
        if (!isDuplicate) {
          validFiles.push(file);
        } else {
          validationErrors.push(`${file.name} is already selected.`);
        }
      }
    }

    return { valid: validFiles, errors: validationErrors };
  };

  // File handlers
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const { valid, errors: validationErrors } = validateFiles(fileArray);

    if (validationErrors.length > 0) {
      setErrors((prev) => [...prev, ...validationErrors]);
    }

    if (valid.length > 0) {
      const newFiles: SelectedFile[] = valid.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: 'pending',
        progress: 0,
      }));

      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setSuccessMessage(
        `Added ${valid.length} file(s). Total: ${selectedFiles.length + valid.length}`
      );

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
    setErrors([]);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    handleFileSelect(e.dataTransfer.files);
  };

  // Upload handler
  const uploadResumes = async () => {
    if (!selectedJobId) {
      setErrors(['Please select a job posting first']);
      return;
    }

    if (selectedFiles.length === 0) {
      setErrors(['Please select at least one file']);
      return;
    }

    setIsUploading(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const files = selectedFiles.map((sf) => sf.file);
      const job = await screeningService.initiateScreening(selectedJobId, files, {
        fileCount: files.length,
        uploadedAt: new Date().toISOString(),
      });

      setUploadedJobId(job.id);
      setSuccessMessage(
        `✓ Upload successful! Screening job ID: ${job.id}. Processing ${job.totalResumes} resumes...`
      );
      setSelectedFiles([]);
      setUploadProgress(0);

      if (onUploadComplete) {
        onUploadComplete(job);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload resumes. Please try again.';
      setErrors([errorMessage]);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Resume Screening Upload</h2>

      {/* Job Selection */}
      <div className="mb-6">
        <label htmlFor="job-select" className="block text-sm font-semibold text-gray-700 mb-2">
          Select Job Posting *
        </label>
        <select
          id="job-select"
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          disabled={isUploading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Select a job --</option>
          {availableJobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      </div>

      {/* Drag Drop Zone */}
      <div
        ref={dragZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-6 p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={handleInputChange}
          disabled={isUploading}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <p className="text-lg font-semibold text-gray-700">
            Drag and drop your PDFs here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or{' '}
            <button
              onClick={handleClick}
              disabled={isUploading}
              className="text-blue-600 hover:text-blue-700 font-semibold disabled:text-gray-400"
            >
              click to browse
            </button>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Max 5MB per file • Up to {MAX_FILES} files • PDF only
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-semibold text-red-800 mb-2">Validation Errors:</p>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, idx) => (
              <li key={idx} className="text-red-700 text-sm">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{successMessage}</p>
        </div>
      )}

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700">
              Selected Files ({selectedFiles.length})
            </h3>
            <button
              onClick={() => setSelectedFiles([])}
              disabled={isUploading}
              className="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedFiles.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  {item.status === 'uploading' && (
                    <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.status === 'success' && (
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}

                  {item.status === 'error' && (
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}

                  <button
                    onClick={() => removeFile(item.id)}
                    disabled={isUploading}
                    className="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed"
                    title="Remove file"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {isUploading && uploadProgress > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Uploading...</span>
            <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploaded Job ID Display */}
      {uploadedJobId && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Screening Job ID:</span>
            <code className="ml-2 px-2 py-1 bg-blue-100 rounded text-blue-900 font-mono">
              {uploadedJobId}
            </code>
          </p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={uploadResumes}
        disabled={isUploading || selectedFiles.length === 0 || !selectedJobId}
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Uploading ({selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Start Screening ({selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''})
          </>
        )}
      </button>

      {/* Info Text */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        ℹ️ Files will be processed in the background. You can check the status on the Results page.
      </p>
    </div>
  );
}

export default ScreeningUpload;
