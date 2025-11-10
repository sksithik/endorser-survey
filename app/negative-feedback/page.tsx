// app/negative-feedback/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquareHeart } from 'lucide-react';

export default function NegativeFeedbackPage() {
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
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <MessageSquareHeart className="w-12 h-12 text-red-500" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Thank you for your honesty.
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          We're sorry your experience didn't meet expectations. We truly value you taking the time to share your feedback with us.
        </p>
        
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 my-8 text-left">
          <h2 className="font-semibold text-lg text-gray-800 mb-2">What Happens Next?</h2>
          <p className="text-gray-700">
            Your feedback has been passed directly to our team. We are taking it very seriously and will use it to improve our service. If your comments require a direct response, we will be in touch shortly.
          </p>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          We are committed to making things right.
        </p>
      </motion.div>
    </div>
  );
}
