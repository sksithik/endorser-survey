
import Header from './Header';

export default function LandingPage() {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-4">
          Create Stunning Video Endorsements
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-8">
          Turn your satisfied customers into powerful video testimonials. Effortlessly collect, manage, and share authentic endorsements.
        </p>
        <div className="flex space-x-4">
          <a href="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
            Get Started for Free
          </a>
          <a href="#features" className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg text-lg">
            Learn More
          </a>
        </div>
      </main>
    </div>
  );
}
