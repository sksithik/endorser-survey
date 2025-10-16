// app/api/script/save/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const { token, script } = await request.json();

  if (!token || !script) {
    return NextResponse.json({ success: false, message: 'Token and script are required.' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('endorser_survey_sessions')
      .update({ selected_script: script })
      .eq('session_id', token);

    if (error) {
      console.error('Error saving script:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error('Unexpected error saving script:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
