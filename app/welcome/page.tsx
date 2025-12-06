// app/welcome/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ConsentForm } from '@/components/ConsentForm';

type IntroData = {
  heading: string;
  videoUrl: string;
  description: string;
}

// Defines the shape of the data we expect from Supabase
type SessionData = {
  intro: IntroData | string; // It can be a JSON string or an already parsed object
  consent_given: boolean;
}

const safeJsonParse = (str: string): IntroData | null => {
  try {
    return JSON.parse(str) as IntroData;
  } catch (e) {
    console.error("Failed to parse intro JSON:", e);
    return null;
  }
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: { sessionId?: string }
}) {
  const { sessionId } = searchParams;

  // If no sessionId is in the URL, show a generic landing page.
  if (!sessionId) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col">
        <header className="sticky top-0 z-10 backdrop-blur bg-black/20 border-b border-white/10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg sparkle" />
              <span className="font-semibold">AI Talking Wizard</span>
            </div>
          </div>
        </header>
        <section className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-3xl mx-auto px-6">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
              Create Your Personalized Video
            </h1>
            <p className="text-lg text-white/70 mb-8">
              Welcome! To begin your personalized experience, please use the unique link that was sent to you.
            </p>
            <p className="text-sm text-white/50">
              If you believe you've reached this page in error, please check the URL and try again.
            </p>
          </div>
        </section>
        <footer className="text-center text-white/50 text-xs p-8">
          AI Talking Wizard © 2025
        </footer>
      </main>
    );
  }

  // Fetch session data, including the new consent_given field
  const { data, error } = await supabase
    .from('endorser_invite_sessions')
    .select('intro, consent_given') // <-- UPDATED SELECT
    .eq('id', sessionId)
    .single<SessionData>();

  if (error || !data) {
    console.error('Supabase fetch error for sessionId:', sessionId, error);
    notFound();
  }

  // **NEW LOGIC**: If consent has not been given, show the consent form.
  if (!data.consent_given) {
    return <ConsentForm sessionId={sessionId} />;
  }

  // --- The rest of your component logic runs only if consent IS given ---

  const introData: IntroData | null = typeof data.intro === 'string'
    ? safeJsonParse(data.intro)
    : data.intro as IntroData;

  if (!introData) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4">Invalid Session Data</h1>
          <p className="text-white/70">The intro data for this session appears to be missing or corrupted.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 backdrop-blur bg-black/20 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg sparkle" />
            <span className="font-semibold">AI Talking Wizard</span>
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 mt-10 md:mt-16 pb-20 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 animate-fade-in-down">
          {introData.heading}
        </h1>

        <div className="rounded-xl overflow-hidden shadow-2xl shadow-purple-500/10 my-8 border border-white/10">
          <video
            src={introData.videoUrl}
            className="w-full h-auto aspect-video"
            controls
            autoPlay
            muted
            loop
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          {introData.description}
        </p>

        <Link href={`/start?sessionId=${sessionId}`} className="btn btn-lg">
          Let's Get Started
        </Link>
      </section>

      <footer className="mt-16 text-center text-white/50 text-xs pb-8">
        This experience will guide you through a few questions to create a personalized video.
      </footer>
    </main>
  )
}