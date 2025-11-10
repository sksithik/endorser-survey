// app/neutral-feedback/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { PenSquare } from 'lucide-react';

export default function NeutralFeedbackPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token'); // Token might be useful for internal logging

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-lg w-full bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center"
      >
        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <PenSquare className="w-12 h-12 text-blue-500" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Thank you for the feedback.
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          We appreciate you taking the time to share your thoughts. Honest feedback like yours is essential for us to learn and improve.
        </p>
        
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 my-8 text-left">
          <h2 className="font-semibold text-lg text-gray-800 mb-2">Your Voice Matters</h2>
          <p className="text-gray-700">
            We're always working to get better, and your input is a valuable part of that process. We'll be reviewing your comments with our team.
          </p>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          You can now close this window.
        </p>
      </motion.div>
    </div>
  );
}
