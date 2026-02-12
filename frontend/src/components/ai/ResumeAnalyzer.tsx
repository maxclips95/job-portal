'use client';

import React, { useState } from 'react';
import { aiService } from '@/services/ai.service';
import { Upload, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface ResumeAnalysis {
  extractedSkills: string[];
  analysis: {
    summary: string;
    strengths: string[];
    improvements: string[];
  };
}

export default function ResumeAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await aiService.analyzeResume(file);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <label className="cursor-pointer">
          <span className="text-blue-600 font-semibold hover:text-blue-700">
            Click to upload
          </span>
          <span className="text-gray-600 ml-2">or drag and drop</span>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        <p className="text-sm text-gray-500 mt-2">PDF up to 10MB</p>
        
        {file && (
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-medium text-blue-900">{file.name}</p>
            <p className="text-xs text-blue-700">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!file || loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
      >
        {loading && <Loader className="h-4 w-4 animate-spin" />}
        {loading ? 'Analyzing Resume...' : 'Analyze Resume'}
      </button>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">AI Analysis</h3>
            <p className="text-sm text-blue-800">{analysis.analysis.summary}</p>
          </div>

          {/* Extracted Skills */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Extracted Skills ({analysis.extractedSkills.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.extractedSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Strengths */}
          {analysis.analysis.strengths.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Strengths</h3>
              <ul className="space-y-2">
                {analysis.analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {analysis.analysis.improvements.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Areas for Improvement</h3>
              <ul className="space-y-2">
                {analysis.analysis.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
