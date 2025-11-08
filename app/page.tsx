'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import LandingPage from '@/components/LandingPage';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/icons';

// Mock data - in a real app, this would come from the API
type BusinessBranding = {
  name: string;
  logoUrl: string;
  themeColor: string;
  videoUrl?: string;
  description?: string;
};

// A component to display a single example tile
const ExampleTile = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    // className="border border-input rounded-lg bg-card overflow-hidden shadow-sm"
  >
    <div className="w-full aspect-video bg-muted flex items-center justify-center text-muted-foreground">
      {icon}
    </div>
    <div className="p-3">
      <p className="font-semibold text-sm text-foreground text-center">{title}</p>
    </div>
  </motion.div>
);

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = createClientComponentClient();

  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);

  useEffect(() => {
    const updateUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.user_metadata.app_role) {
        try {
          await fetch('/api/auth/update-user-role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ app_role: 'endorser' }),
          });
          // Refresh the user session to get the updated metadata
          await supabase.auth.refreshSession();
        } catch (error) {
          console.error('Error updating user role:', error);
        }
      }
    };

    updateUserRole();
  }, [supabase.auth]);

  // Icons for example tiles
  const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
  const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
  const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      setIsValidating(true);
      try {
        const response = await fetch(`/api/invite/validate?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Validation failed');
        }

        if (data.success) {
          setBranding(data.branding);
        } else {
          throw new Error(data.message || 'Invalid token');
        }
      } catch (e: any) {
        setError(e.message || 'An unknown error occurred.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  if (!token) {
    return <LandingPage />;
  }

  if (isValidating) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-center p-4">
        <Icons.spinner className="h-12 w-12 animate-spin" />
        <h2 className="text-xl font-semibold text-foreground mt-4">Validating your invitation...</h2>
      </div>
    );
  }

  if (error || !branding) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-center p-4">
        <Header />
        <div className="max-w-md mt-24">
          <h1 className="text-2xl font-bold text-foreground mb-2">Oops! Something went wrong.</h1>
          <p className="text-muted-foreground">{error || 'Could not load invitation details.'}</p>
          <p className="text-sm text-muted-foreground mt-4">
            Please check the link and try again. If the problem persists, contact the business that invited you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-background p-4">
      <Header />
      <div
        className="max-w-6xl w-full text-center mt-24 space-y-16"
      >
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-background border border-border shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/assets/abstract_Gradient.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div
            className="relative z-10 max-w-3xl mx-auto px-4"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-foreground mb-6">
              {branding.name} wants your feedback!
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              {branding.description}
            </p>
            <Link
              href={`/questionnaire?token=${token}`}
              className="inline-block bg-primary text-primary-foreground font-bold text-lg px-10 py-5 rounded-full shadow-xl hover:bg-primary/90 transition-all transform hover:scale-105"
              style={{ backgroundColor: branding.themeColor }}
            >
              Begin My Review
            </Link>
          </div>
        </section>

        {/* Video Section */}
        {branding.videoUrl && (
          <section
            className="max-w-4xl mx-auto"
          >
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-primary/20 border border-border">
              <video
                src={branding.videoUrl}
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
          </section>
        )}

        {/* Features Section */}
        <section>
          <h2
            className="text-4xl font-bold text-foreground mb-10"
          >
            See how others have shared their story
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* <ExampleTile title="AI Avatar Example" icon={<UserIcon />} />
            <ExampleTile title="Real Camera Example" icon={<CameraIcon />} />
            <ExampleTile title="Slideshow Example" icon={<ImageIcon />} /> */}
          </div>
        </section>

        {/* Final Call to Action */}
        <section
          className="py-16 bg-card rounded-xl border border-border shadow-lg"
        >
          <h2 className="text-3xl font-bold text-foreground mb-6">Ready to share your story?</h2>
          <Link
            href={`/questionnaire?token=${token}`}
            className="inline-block bg-primary text-primary-foreground font-bold text-lg px-10 py-5 rounded-full shadow-xl hover:bg-primary/90 transition-all transform hover:scale-105"
            style={{ backgroundColor: branding.themeColor }}
          >
            Begin My Review
          </Link>
        </section>

        <footer>
          Powered by EndorseGen
        </footer>
      </div>
    </div>
  );
}