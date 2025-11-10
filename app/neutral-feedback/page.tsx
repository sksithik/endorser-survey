// app/neutral-feedback/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function NeutralFeedbackPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You for Your Feedback</h1>
        <p className="text-gray-700 mb-8">
          We appreciate your honesty. Your input is valuable and helps us improve.
        </p>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What's Next?</h2>
          <p className="text-gray-600">
            You are on the <span className="font-semibold text-yellow-600">Neutral Journey</span>.
            We may ask for more details or follow up with you later.
          </p>
          {token && <p className="text-sm text-gray-400 mt-4">Token: {token}</p>}
        </div>
      </div>
    </div>
  );
}
