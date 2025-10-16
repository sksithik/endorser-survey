// app/api/session/[token]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token is required.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('endorser_survey_sessions')
      .select('selfie_public_url, voice_public_url')
      .eq('session_id', token)
      .single();

    if (error) {
      console.error('Error fetching session:', error);
      // If no row is found, single() returns an error. This is expected.
      // We can return a success response with null data.
      if (error.code === 'PGRST116') { 
        return NextResponse.json({ success: true, data: null });
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (e) {
    console.error('Unexpected error fetching session:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
