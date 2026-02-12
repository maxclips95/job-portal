/**
 * Assessment Taker Component
 * Interactive assessment UI with timer, progress, and instant feedback
 */

'use client';

import React, { useState, useEffect } from 'react';

interface Question {
  id: string;
  type: string;
  content: string;
  options?: string[];
  points: number;
  timeLimit?: number;
}

interface AssessmentTakerProps {
  assessmentId: string;
  questions: Question[];
  durationMinutes: number;
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

export const AssessmentTaker: React.FC<AssessmentTakerProps> = ({
  assessmentId,
  questions,
  durationMinutes,
  onSubmit,
  onCancel,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAnswer = (answer: string) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimeWarning = timeRemaining < 300;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Assessment in Progress</h2>
          <div
            className={`text-2xl font-mono font-bold ${
              isTimeWarning ? 'text-red-600' : 'text-gray-700'
            }`}
          >
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
      </div>

      {/* Question */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <h3 className="text-lg font-semibold mb-6">{currentQuestion.content}</h3>

        {/* Multiple Choice */}
        {currentQuestion.type === 'multiple-choice' && (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, idx) => (
              <label
                key={idx}
                className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option}
                  checked={answers[currentQuestion.id] === option}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="mr-3 w-4 h-4"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

        {/* True/False */}
        {currentQuestion.type === 'true-false' && (
          <div className="flex gap-4">
            {['True', 'False'].map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                  answers[currentQuestion.id] === opt
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Essay/Code */}
        {(currentQuestion.type === 'essay' ||
          currentQuestion.type === 'code-review') && (
          <textarea
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Enter your response..."
            className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={8}
          />
        )}

        <p className="text-sm text-gray-500 mt-4">
          Points: <span className="font-semibold">{currentQuestion.points}</span>
        </p>
      </div>

      {/* Navigation & Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          ← Previous
        </button>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            Cancel
          </button>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
