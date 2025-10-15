// app/api/video/save-url/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const { token, videoUrl } = await request.json();

  if (!token || !videoUrl) {
    return NextResponse.json({ success: false, message: 'Token and videoUrl are required.' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('endorser_survey_sessions')
      .update({ video_url: videoUrl })
      .eq('session_id', token);

    if (error) {
      console.error('Supabase save video URL error:', error);
      return NextResponse.json({ success: false, message: 'Failed to save video URL.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Video URL saved.' });

  } catch (e) {
    console.error('Unexpected error saving video URL:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}