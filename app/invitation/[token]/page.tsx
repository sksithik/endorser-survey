// app/invitation/[token]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type InvitationData = {
  email: string;
  phone: string;
  caseType: string;
  lastName: string;
  firstName: string;
  orderType: string;
  inviteCopy: string;
  servicePerformed: string;
}

type InviteSessionData = {
  invitation_data: InvitationData | string;
};

const safeJsonParse = (str: string): InvitationData | null => {
  try {
    return JSON.parse(str) as InvitationData;
  } catch (e) {
    console.error("Failed to parse invitation_data JSON:", e);
    return null;
  }
}

export default async function InvitationPage({
  params,
}: {
  params: { token: string }
}) {
  const { token } = params;

  if (!token) {
    notFound();
  }

  const { data, error } = await supabase
    .from('endorser_invite_sessions')
    .select('invitation_data')
    .eq('id', token)
    .single<InviteSessionData>();

  if (error || !data) {
    console.error('Supabase fetch error for token:', token, error);
    notFound();
  }

  const invitationData: InvitationData | null = data && data.invitation_data 
    ? (typeof data.invitation_data === 'string'
      ? safeJsonParse(data.invitation_data)
      : data.invitation_data as InvitationData)
    : null;

  return (
    <main className="relative min-h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden p-4">
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
      <div className="relative z-10 w-full max-w-lg">
        {!invitationData ? (
          <Card className="w-full bg-black/70 backdrop-blur-lg border-red-500/50">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-white">Invalid Invitation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 text-center">The invitation link is either invalid or has expired. Please check the link and try again.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full bg-black/70 backdrop-blur-lg border-purple-500/50 animate-fade-in">
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-3xl font-bold text-white">You're Invited</CardTitle>
              <CardDescription className="text-purple-300/80 pt-2">
                Your feedback is valuable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="p-6 rounded-lg bg-white/10 border border-white/20 text-center">
                <h3 className="font-semibold text-xl text-white">Hello, {invitationData.firstName}!</h3>
                <p className="text-base text-white/80 mt-2">{invitationData.inviteCopy || `We'd love to hear about your experience with our ${invitationData.servicePerformed || 'services'}.`}</p>
              </div>
              
              <Link href={`/questionnaire?token=${token}`} className="w-full block">
                <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-bold py-3 text-lg transition-all duration-300 transform hover:scale-105">
                  Begin My Review
                </Button>
              </Link>

              <div className="text-xs text-center text-white/50 space-y-1 pt-4">
                <p>Service: {invitationData.servicePerformed}</p>
                <p>Reference: {invitationData.caseType}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

// Add a simple fade-in animation to globals.css if it's not already there
/*
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .animate-fade-in {
    animation: fadeIn 1s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
*/
