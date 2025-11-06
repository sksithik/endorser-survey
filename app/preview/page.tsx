// app/preview/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const jobId = searchParams.get('jobId');

  const [status, setStatus] = useState('processing');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Initializing video generation...');

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function pollTalkingVideo() {
      if (!jobId || !token) return;
      try {
        const response = await fetch(`/api/talking-video-heygen?id=${jobId}&token=${token}`);
        const data = await response.json();
        if (!isMounted) return;
        if (data.status === 'completed') {
          setStatus('completed');
          setVideoUrl(data.url);
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.error?.message || 'Video generation failed.');
        } else {
          setStatus(data.status || 'processing');
          setStatusMessage(data.status ? `Status: ${data.status}` : 'Processing...');
          timeoutId = setTimeout(pollTalkingVideo, 5000);
        }
      } catch (e) {
        console.error('Talking video poll error', e);
        if (isMounted) timeoutId = setTimeout(pollTalkingVideo, 5000);
      }
    }

    async function pollSlideshow() {
      if (!token) return;
      try {
        const res = await fetch(`/api/session/${token}`);
        const data = await res.json();
        if (!isMounted) return;
        const session = data?.data;
        if (session?.final_video_url) {
          setVideoUrl(session.final_video_url);
          setAudioUrl(session.generated_audio_url || null);
          setStatus('completed');
        } else {
          setStatus('processing');
          setStatusMessage('Generating slideshow...');
          timeoutId = setTimeout(pollSlideshow, 3000);
        }
      } catch (e) {
        console.error('Slideshow poll error', e);
        if (isMounted) timeoutId = setTimeout(pollSlideshow, 5000);
      }
    }

    if (type === 'slideshow') {
      pollSlideshow();
    } else {
      pollTalkingVideo();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [jobId, token, type]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="max-w-4xl w-full">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Your Video is Being Generated</h1>
          <p className="text-lg text-gray-600 mt-2">Please wait a few moments. The page will update automatically when your video is ready.</p>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="max-w-2xl mx-auto">
            <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
              {status === 'completed' && videoUrl ? (
                <>
                  <video key={videoUrl} src={videoUrl} className="w-full h-full" controls autoPlay playsInline>
                    Your browser does not support the video tag.
                  </video>
                  {type === 'slideshow' && audioUrl && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black/40 backdrop-blur-sm p-2 rounded flex items-center gap-3">
                      <audio src={audioUrl} controls className="w-full" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gray-800">
                  {status === 'failed' ? (
                    <>
                      <p className="text-xl font-semibold text-red-400">Generation Failed</p>
                      <p className="text-gray-300 text-sm mt-2 max-w-md text-center">{error}</p>
                    </>
                  ) : (
                    <>
                      <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                      <p className="text-xl font-semibold capitalize">{status}...</p>
                      <p className="text-gray-300">{statusMessage}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {status === 'completed' && videoUrl && (
            <div className="mt-6">
                <div className="flex flex-wrap items-center justify-center gap-4 border-t border-gray-200 pt-6">
                    <a href={videoUrl} download className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 no-underline">Download MP4</a>
                    <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="px-5 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800">Copy Share Link</button>
                    <Link href={`/share?token=${token}`} className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 no-underline">Next</Link>
                </div>
            </div>
          )}
        </div>
        <div className="text-center mt-8">
            <Link href={`/recording?token=${token}`} className="text-gray-600 hover:text-indigo-600 font-semibold">
                &larr; Back to Recording Options
            </Link>
        </div>
      </div>
    </div>
  );
}