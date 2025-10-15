// app/api/invite/validate/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token is required.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('endorser_survey_sessions')
      .select('session_id, intro') // also selecting 'intro' to get branding, assuming it's there
      .eq('session_id', token)
      .single();

    if (error || !data) {
      console.error('Supabase validation error:', error);
      return NextResponse.json({ success: false, message: 'Invalid or expired invitation link.' }, { status: 404 });
    }

    // Safely parse the intro data, which might be a JSON string
    const introData = typeof data.intro === 'string' ? JSON.parse(data.intro) : data.intro;

    const branding = {
      name: introData?.heading || 'Innovate Inc.',
      logoUrl: '/logo-placeholder.svg',
      themeColor: '#4F46E5',
      videoUrl: introData?.videoUrl, // Pass the video URL to the frontend
      description: introData?.description || 'Help them improve by sharing your experience.'
    };

    return NextResponse.json({ success: true, branding });

  } catch (e) {
    console.error('Unexpected error during validation:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}