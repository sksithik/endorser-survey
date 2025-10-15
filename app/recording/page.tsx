// app/recording/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const RecordingModeCard = ({ pathname, token, icon, title, description }: { pathname: string, token: string | null, icon: React.ReactNode, title: string, description: string }) => (
  <Link href={{ pathname, query: { token } }} className="block p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg hover:border-indigo-500 transition-all group">
    <div className="flex items-center mb-4">
      <div className="p-3 bg-indigo-100 rounded-lg mr-4 group-hover:bg-indigo-200 transition-colors">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
    </div>
    <p className="text-gray-600">{description}</p>
  </Link>
);


export default function RecordingModePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
  const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
  const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;


  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-4xl w-full">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Choose Your Recording Mode</h1>
          <p className="text-lg text-gray-600 mt-2">How would you like to create your video testimonial?</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <RecordingModeCard
            pathname="/recording/teleprompter"
            token={token}
            icon={<CameraIcon />}
            title="Teleprompter"
            description="Record yourself reading the script with a teleprompter on screen. The most authentic option."
          />
          <RecordingModeCard
            pathname="/recording/avatar"
            token={token}
            icon={<UserIcon />}
            title="AI Avatar"
            description="Generate a video with a realistic AI avatar that speaks your script. Requires a selfie."
          />
          <RecordingModeCard
            pathname="/recording/slideshow"
            token={token}
            icon={<ImageIcon />}
            title="Slideshow Video"
            description="Create a simple video with your selfie, voice-over, and animated captions."
          />
        </div>

        <div className="text-center mt-12">
            <Link href={{ pathname: '/script', query: { token } }} className="text-gray-600 hover:text-indigo-600 font-semibold">
                &larr; Go back to edit script
            </Link>
        </div>
      </div>
    </div>
  );
}
