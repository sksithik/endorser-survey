// app/api/share/generate-content/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token is required.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('endorser_survey_sessions')
      .select('survey')
      .eq('session_id', token)
      .single();

    if (error || !data) {
      console.error('Supabase error fetching survey data:', error);
      return NextResponse.json({ success: false, message: 'Invalid session token.' }, { status: 401 });
    }

    const survey = data.survey as any;
    // In a real implementation, you would use the survey data to generate content with an AI model.
    // For now, we'll use mock data.

    const generatedContent = {
        emailSubject: `Check out my experience with ${survey?.projectName || 'Innovate Inc.'}`,
        emailBody: `Hi,

I just recorded a video about my experience with ${survey?.projectName || 'Innovate Inc.'} and wanted to share it with you. I hope you find it insightful!

You can watch the video here: `,
        socialText: `I just shared my experience with ${survey?.projectName || 'Innovate Inc.'}! Check out my video testimonial.`, 
    };

    return NextResponse.json({ success: true, ...generatedContent });

  } catch (e) {
    console.error('Unexpected error generating share content:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
