import Header from './Header';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute z-0 w-auto min-w-full min-h-full max-w-none"
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
          opacity: 0.3,
        }}
      >
        <source
          src="https://videos.pexels.com/video-files/3209828/3209828-hd.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white text-center px-4">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center">
          <motion.h1
            className="text-5xl md:text-7xl font-extrabold tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            Authentic Video Endorsements.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Automated by AI.
            </span>
          </motion.h1>
          <motion.p
            className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            Effortlessly collect and transform customer feedback into powerful, on-brand video testimonials that build trust and drive conversions.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          >
            <Link
              href="/register"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              Get Started for Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-transparent border-2 border-gray-400 hover:bg-gray-800 hover:border-gray-500 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-500"
            >
              Log In
            </Link>
          </motion.div>
        </main>

        <footer className="w-full text-center p-4 text-gray-400">
          Powered by EndorseGen
        </footer>
      </div>
    </div>
  );
}
