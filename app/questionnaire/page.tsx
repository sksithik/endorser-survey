// app/questionnaire/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Define the new, more detailed question structure
type QuestionOption = {
  value: string;
  id: string;
};

type Question = {
  id: string;
  text: string;
  type: 'text' | 'radio';
  options?: QuestionOption[];
};

// API response type
type SurveyData = {
  businessName: string;
  questions: Question[];
  answers: Record<string, string>; // Question IDs are now strings
  currentStep: number;
};

export default function QuestionnairePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // Use string for question ID
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (!token) {
      setError("No token provided. Please go back to the invitation link.");
      setIsLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/survey/load?token=${token}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to load survey');
        }
        setSurveyData(data);
        setAnswers(data.answers || {});
        setCurrentQuestionIndex(data.currentStep || 0);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurvey();
  }, [token]);

  // This useEffect hook handles auto-saving the user's progress
  useEffect(() => {
    if (isLoading) {
      return;
    }

    const saveProgress = async () => {
      try {
        await fetch('/api/survey/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            answers,
            currentStep: currentQuestionIndex,
          }),
        });
      } catch (e) {
        console.error("Failed to save progress:", e);
      }
    };

    const handler = setTimeout(() => {
      saveProgress();
    }, 2000);

    return () => {
      clearTimeout(handler);
    };
  }, [answers, currentQuestionIndex, token, isLoading]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (surveyData && currentQuestionIndex < surveyData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/survey/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, answers }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit survey.');
      }

      if (data.redirectPath) {
        router.push(data.redirectPath);
      } else {
        console.error("No redirect path received from server.");
        setError("Could not determine the next step. Please try again.");
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (isLoading) {
    return <div className="w-full min-h-screen flex items-center justify-center"><div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div></div>;
  }

  if (error || !surveyData) {
    return <div className="w-full min-h-screen flex items-center justify-center text-center p-4"><p className="text-red-500">{error || "Failed to load survey."}</p></div>;
  }

  const currentQuestion = surveyData.questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
        <div className="w-full min-h-screen flex items-center justify-center text-center p-4">
            <p className="text-red-500">Could not load the current question. The survey may be misconfigured or complete.</p>
        </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === surveyData.questions.length - 1;

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Feedback for {surveyData.businessName}</h1>
          <p className="text-gray-600">Question {currentQuestionIndex + 1} of {surveyData.questions.length}</p>
        </header>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <label htmlFor={`question-${currentQuestion.id}`} className="block text-xl font-semibold text-gray-800 mb-6">
            {currentQuestion.text}
          </label>
          
          {currentQuestion.type === 'text' && (
            <textarea
              id={`question-${currentQuestion.id}`}
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="w-full h-40 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-900"
              placeholder="Type your thoughts here..."
            />
          )}

          {currentQuestion.type === 'radio' && (
            <div className="flex flex-col gap-3">
              {currentQuestion.options?.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswerChange(currentQuestion.id, option.value)}
                  className={`w-full p-4 rounded-md border text-left transition-colors ${answers[currentQuestion.id] === option.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                >
                  {option.value}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Finish & Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
