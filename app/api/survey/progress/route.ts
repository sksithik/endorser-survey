// app/api/survey/progress/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const { token, answers, currentStep } = await request.json();

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token is required.' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('endorser_survey_sessions')
      .update({
        survey: answers,
        current_step: currentStep,
      })
      .eq('session_id', token);

    if (error) {
      console.error('Supabase progress save error:', error);
      return NextResponse.json({ success: false, message: 'Failed to save progress.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Progress saved.' });

  } catch (e) {
    console.error('Unexpected error saving progress:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
