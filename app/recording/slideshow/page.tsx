// app/recording/slideshow/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';



interface SlideItem {
  image: File;
  text: string;
}

// Helper: safely parse JSON, falling back to text when server returns HTML error page
async function safeParseJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch (e) { console.warn('Failed to parse JSON despite JSON content-type', e); }
  }
  try {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
  } catch { return null; }
}

export default function SlideshowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [script, setScript] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  // Auto-load previously selected script via dedicated API (server-side supabaseAdmin).
  useEffect(() => {
    let cancelled = false;
    async function loadScript() {
      if (!token || script.trim()) return; // don't overwrite user edits
      setIsLoadingScript(true);
      try {
        const res = await fetch(`/api/script/get?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          const t = await res.text().catch(()=>'');
          console.warn('Script get failed status', res.status, t.slice(0,120));
          return;
        }
        const data = await safeParseJson(res);
        const loaded = data?.selected_script as string | null;
        if (!cancelled && loaded) setScript(loaded);
      } catch (e) {
        console.warn('Failed loading existing script', e);
      } finally {
        if (!cancelled) setIsLoadingScript(false);
      }
    }
    loadScript();
    return () => { cancelled = true; };
  }, [token]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newSlides = Array.from(event.target.files).map(file => ({ image: file, text: '' }));
      setSlides([...slides, ...newSlides]);
    }
  };

  const handleTextChange = (index: number, text: string) => {
    const newSlides = [...slides];
    newSlides[index].text = text;
    setSlides(newSlides);
  };

  async function uploadImages(): Promise<string[]> {
    return Promise.all(slides.map(async slide => {
      const formData = new FormData();
      formData.append('token', token || '');
      formData.append('file', slide.image);
      const res = await fetch('/api/selfie/upload', { method: 'POST', body: formData });
      const data = await safeParseJson(res);
      if (!res.ok || !data.publicUrl) throw new Error('Image upload failed');
      return data.publicUrl as string;
    }));
  }

  const handleGenerateAudio = async () => {
    try {
      setError(null);
      setIsGeneratingAudio(true);
      setAudioUrl(null);
      if (!script.trim()) {
        setError('Script is empty. Add text to generate voice.');
        return;
      }
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, script }),
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data?.details || 'Voice generation failed');
      setAudioUrl(data.generated_audio_url);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateVideo = async () => {
    try {
      setError(null);
      setIsGeneratingVideo(true);
      if (slides.length === 0) {
        setError('Please upload at least one image.');
        return;
      }
      const imageUrls = await uploadImages();
      const texts = slides.map(slide => slide.text);
      const body: any = { token, images: imageUrls, texts };
      if (audioUrl) body.audioUrl = audioUrl;
      const res = await fetch('/api/slideshow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await safeParseJson(res);
      if (!res.ok || !data.success) throw new Error(data?.details || 'Slideshow generation failed');
      router.push(`/preview?token=${token}&type=slideshow`);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <>
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-4xl w-full">
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Create a Slideshow Video</h1>
            <p className="text-lg text-gray-600 mt-2">Upload images, add per-slide text, optionally enter a script to generate voice narration, then create your slideshow video.</p>
          </header>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">1. Upload Your Images</h3>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">2. Add Text to Your Slides</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slides.map((slide, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <img src={URL.createObjectURL(slide.image)} alt={`Slide ${index + 1}`} className="w-full h-32 object-cover rounded-lg mb-4" />
                    <input
                      type="text"
                      value={slide.text}
                      onChange={(e) => handleTextChange(index, e.target.value)}
                      placeholder={`Text for slide ${index + 1}`}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-xl font-semibold mb-4">3. Voice Narration</h3>
              {isLoadingScript && <p className="text-sm text-gray-500 mb-2">Loading saved script…</p>}
              <textarea
                className="w-full min-h-[140px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                placeholder="Narration script (auto-loaded if previously selected)"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                disabled={isLoadingScript}
              />
              <div className="flex items-center gap-4 mt-4">
                <button
                  type="button"
                  onClick={handleGenerateAudio}
                  disabled={!script.trim() || isGeneratingAudio}
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md disabled:bg-gray-400 hover:bg-indigo-700"
                >
                  {isGeneratingAudio ? 'Generating Voice…' : audioUrl ? 'Regenerate Voice' : 'Generate Voice'}
                </button>
                {audioUrl && (
                  <audio controls src={audioUrl} className="h-10" />
                )}
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            {error && <p className="mb-4 text-red-600 font-medium">{error}</p>}
            <button
              onClick={handleGenerateVideo}
              disabled={slides.length === 0 || isGeneratingVideo}
              className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGeneratingVideo ? 'Building Video…' : 'Generate Slideshow Video'}
            </button>
          </div>
           <div className="text-center mt-6">
                <Link href={`/recording?token=${token}`} className="text-gray-600 hover:text-indigo-600 font-semibold">
                    &larr; Go back to recording options
                </Link>
            </div>
        </div>
      </div>
    </>
  );
}
