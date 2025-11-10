// app/positive-feedback/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';

export default function PositiveFeedbackPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: -15 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          className="mx-auto w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mb-6"
        >
          <Star className="w-12 h-12 text-white" fill="white" />
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
          You're a star!
          <Sparkles className="w-6 h-6 text-yellow-500" />
        </h1>
        <p className="text-gray-700 text-lg mb-6">
          Thank you for sharing such wonderful feedback. We're thrilled you had a great experience!
        </p>
        
        <div className="bg-green-100/70 border border-green-200/80 rounded-lg p-4 my-8">
          <p className="text-lg font-semibold text-green-900">As a token of our appreciation, we've added 50 points to your account.</p>
        </div>

        <p className="text-gray-800 text-lg font-medium mb-4">Ready to share your story?</p>
        <p className="text-gray-600 mb-8">
          Let's turn your amazing feedback into a short testimonial video. It's quick, easy, and makes a huge impact.
        </p>

        {token && (
          <Link href={`/script?token=${token}`} passHref>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block w-full px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors"
            >
              Let's Go!
            </motion.a>
          </Link>
        )}
      </motion.div>
    </div>
  );
}
