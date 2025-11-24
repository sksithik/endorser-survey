
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'Token is required.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('endorser_invite_sessions')
      .select('questionnaire_data, invitation_data')
      .eq('id', token)
      .single();

    if (error || !data) {
      console.error('Supabase survey load error:', error);
      return NextResponse.json({ message: 'Invalid session token.' }, { status: 401 });
    }
    
    const invitationData = (
        typeof data.invitation_data === 'string'
          ? JSON.parse(data.invitation_data)
          : data.invitation_data
      ) as { servicePerformed?: string };

    const questions = Array.isArray(data.questionnaire_data) ? data.questionnaire_data : [];
    
    // NOTE: The 'endorser_invite_sessions' table does not have fields for answers or current_step.
    // These are initialized to default values. The progress saving feature of the
    // questionnaire page will not work correctly with this data source.
    return NextResponse.json({
      businessName: `Feedback for ${invitationData.servicePerformed || 'our service'}`,
      questions: questions,
      answers: {}, // No place to store answers in this table
      currentStep: 0, // No place to store current step in this table
    });

  } catch (e) {
    console.error('Unexpected error loading survey:', e);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
