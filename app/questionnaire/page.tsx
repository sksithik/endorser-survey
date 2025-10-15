// app/questionnaire/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// API response type
type SurveyData = {
  businessName: string;
  questions: any[]; // Assuming questions can vary
  answers: Record<number, string>;
  currentStep: number;
};

export default function QuestionnairePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
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
    // Don't save anything until the initial survey data has loaded
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
        // Optional: handle response, maybe show a "Saved" indicator
      } catch (e) {
        console.error("Failed to save progress:", e);
        // Optional: notify user of save failure
      }
    };

    // Debounce the save function
    const handler = setTimeout(() => {
      saveProgress();
    }, 2000); // Auto-save after 2 seconds of inactivity

    // Cleanup function to cancel the timeout if the component unmounts
    // or if the dependencies change before the timeout has fired.
    return () => {
      clearTimeout(handler);
    };
  }, [answers, currentQuestionIndex, token, isLoading]);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < surveyData!.questions.length - 1) {
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

      // Redirect to the next step
      router.push(`/script?token=${token}`);
    } catch (e: any) {
      setError(e.message);
      // Optionally, show an error message to the user
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
    // This can happen if the survey is empty or the currentStep is out of bounds.
    // We can show a loading state or an error message.
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
          <label htmlFor={`question-${currentQuestion.id}`} className="block text-xl font-semibold text-gray-800 mb-4">
            {currentQuestion.text}
          </label>
          {currentQuestion.type === 'textarea' && (
            <textarea
              id={`question-${currentQuestion.id}`}
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="w-full h-40 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder="Type your thoughts here..."
            />
          )}
           {currentQuestion.type === 'rating' && (
            <div className="flex justify-center gap-2">
              {[...Array(10)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswerChange(currentQuestion.id, (i + 1).toString())}
                  className={`w-10 h-10 rounded-full border transition-colors ${answers[currentQuestion.id] === (i + 1).toString() ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                >
                  {i + 1}
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
              Finish & Generate Script
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
