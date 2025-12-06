// app/[org_slug]/invite/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// For now we generate a client-side link to start the survey. In a full implementation
// you would call an API to create a new endorser_invite_sessions row and return id.

interface InvitePageProps {
  params: { org_slug: string };
  searchParams: { token?: string };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { org_slug } = params;

  // Basic slug validation (avoid empty / reserved)
  if (!org_slug) return notFound();

  // Placeholder branding – normally fetched from DB via org_slug
  const branding = {
    name: org_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    valueBar: '1000 pts = $10',
    videoUrl: '/intro-placeholder.mp4',
    description: 'Help others find good help like you did.',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-gray-50">
      <div className="w-full max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{branding.name} Endorser Invite</h1>
          <p className="text-gray-600">{branding.description}</p>
          <div className="rounded bg-indigo-600 text-white px-4 py-2 inline-block font-semibold">
            {branding.valueBar}
          </div>
        </header>
        <div className="aspect-video w-full bg-black rounded overflow-hidden flex items-center justify-center text-white text-sm">
          <span>Intro Video Placeholder</span>
        </div>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">How it works</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Quick survey (2–3 minutes)</li>
            <li>We draft review + video script for you</li>
            <li>Record or generate a short testimonial</li>
            <li>Share & submit proof links</li>
            <li>Earn points — redeem for gift cards</li>
          </ol>
        </section>
        <div className="pt-4">
          <Link href={`/questionnaire?org=${encodeURIComponent(org_slug)}`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded shadow font-medium">
            Start Survey
          </Link>
        </div>
        <p className="text-xs text-gray-500">By continuing you agree to provide an honest testimonial. Fraud or reused links may be flagged for manual review.</p>
      </div>
    </div>
  );
}
