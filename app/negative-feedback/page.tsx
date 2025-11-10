// app/negative-feedback/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function NegativeFeedbackPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold text-red-900 mb-4">We're Sorry to Hear That</h1>
        <p className="text-gray-700 mb-8">
          We apologize for the experience you had. We take your feedback very seriously and will use it to make things right.
        </p>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Commitment to You</h2>
          <p className="text-gray-600">
            You are on the <span className="font-semibold text-red-600">Negative Journey (Recovery Mode)</span>.
            Please expect a follow-up from our team shortly to address your concerns.
          </p>
          {token && <p className="text-sm text-gray-400 mt-4">Token: {token}</p>}
        </div>
      </div>
    </div>
  );
}
