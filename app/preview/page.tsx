// app/preview/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type'); // 'avatar', 'slideshow', 'teleprompter'
  const jobId = searchParams.get('jobId') || 'mockJob123'; // In a real app, this would come from the previous step

  const [jobStatus, setJobStatus] = useState({ status: 'Processing', message: 'Initializing...' });
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [showSubtitles, setShowSubtitles] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const pollStatus = async () => {
      if (!isMounted) return;

      try {
        const response = await fetch(`/api/job/status?id=${jobId}`);
        const data = await response.json();

        if (isMounted) {
          setJobStatus(data);
          if (data.status !== 'Ready') {
            timeoutId = setTimeout(pollStatus, 3000);
          }
        }
      } catch (error) {
        console.error("Failed to fetch job status:", error);
        if (isMounted) {
            timeoutId = setTimeout(pollStatus, 3000); // Retry on error
        }
      }
    };

    pollStatus();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [jobId]);

  const isReady = jobStatus.status === 'Ready';
  const videoUrl = `/final-video-${type}.mp4`; // Placeholder video URL

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="max-w-4xl w-full">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Preview Your Video</h1>
          <p className="text-lg text-gray-600 mt-2">Review your generated video and share it with the world.</p>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className={`mx-auto transition-all duration-300 ${aspectRatio === '9:16' ? 'max-w-sm' : 'max-w-2xl'}`}>
            <div className={`relative w-full bg-black rounded-lg overflow-hidden ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
              {isReady ? (
                <>
                  <video key={videoUrl} src={videoUrl} className="w-full h-full" controls autoPlay playsInline>
                    Your browser does not support the video tag.
                  </video>
                  {showSubtitles && (
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                        <p className="inline-block bg-black bg-opacity-50 text-white text-lg px-4 py-1 rounded">
                            This is where subtitles would appear.
                        </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                    <p className="text-xl font-semibold">{jobStatus.status}...</p>
                    <p className="text-gray-300">{jobStatus.message}</p>
                </div>
              )}
            </div>
          </div>

          {isReady && (
            <div className="mt-6">
                <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                    <div>
                        <span className="text-sm font-semibold mr-2">Aspect Ratio:</span>
                        <button onClick={() => setAspectRatio('16:9')} className={`px-3 py-1 text-sm rounded-md ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>16:9</button>
                        <button onClick={() => setAspectRatio('9:16')} className={`px-3 py-1 text-sm rounded-md ml-2 ${aspectRatio === '9:16' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>9:16</button>
                    </div>
                    <div>
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" checked={showSubtitles} onChange={() => setShowSubtitles(!showSubtitles)} className="sr-only peer" />
                            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            <span className="ml-3 text-sm font-semibold">Subtitles</span>
                        </label>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 border-t border-gray-200 pt-6">
                    <a href={`/api/export?videoId=${jobId}&type=video`} download className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 no-underline">Download MP4</a>
                    <a href={`/api/export?videoId=${jobId}&type=caption`} download className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 no-underline">Export Captions</a>
                    <button onClick={() => navigator.clipboard.writeText(`https://your-app.com/preview?jobId=${jobId}`)} className="px-5 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800">Copy Share Link</button>
                </div>
            </div>
          )}
        </div>
        <div className="text-center mt-8">
            <Link href={`/recording?token=${token}`} className="text-gray-600 hover:text-indigo-600 font-semibold">
                &larr; Re-record video
            </Link>
        </div>
      </div>
    </div>
  );
}