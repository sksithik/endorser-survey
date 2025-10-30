
import Header from './Header';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 to-black text-white relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(100, 0, 255, 0.3), transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 200, 255, 0.3), transparent 50%)' }}></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      <Header />
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-16 relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="text-6xl md:text-8xl font-extrabold leading-tight mb-6 drop-shadow-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600"
        >
          Elevate Your Brand with AI-Powered Endorsements
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="text-xl md:text-2xl text-gray-200 max-w-4xl mb-12 leading-relaxed"
        >
          Transform customer stories into compelling video testimonials. Leverage cutting-edge AI to effortlessly create, manage, and amplify authentic endorsements that drive growth.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
        >
          <a
            href="/register"
            className="bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-bold py-4 px-10 rounded-xl text-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Create invite
          </a>
          <a
            href="#features"
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-10 rounded-xl text-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-gray-500"
          >
            Discover Features
          </a>
        </motion.div>
      </main>
    </div>
  );
}
