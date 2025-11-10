// app/positive-feedback/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PositiveFeedbackPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-green-50 p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-green-800 mb-4">Thank You!</h1>
          <p className="text-gray-700 text-lg mb-2">
            We’re so glad you had a great experience!
          </p>
          <p className="text-gray-600 mb-6">
            Your feedback is incredibly valuable to us.
          </p>
          
          <div className="bg-green-100 border border-green-200 rounded-lg p-4 my-6">
            <p className="text-lg font-semibold text-green-900">You've earned 50 points!</p>
            <p className="text-green-800">Your reward has been added to your account.</p>
          </div>

          <p className="text-gray-800 font-semibold mb-4">Ready for the next step?</p>
          <p className="text-gray-600 mb-6">
            Let's use your feedback to create a powerful testimonial. We'll help you generate a script for a short video.
          </p>

          {token && (
            <Link
              href={`/script?token=${token}`}
              className="inline-block px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-transform transform hover:scale-105"
            >
              Create My Video Script
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
