
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// This is the question structure the frontend expects, based on app/questionnaire/page.tsx
type QuestionOption = {
  value: string;
  id: string;
};

type Question = {
  id: string;
  text: string;
  type: 'text' | 'radio';
  options?: QuestionOption[];
};

type InvitationData = {
  servicePerformed?: string;
  // Other fields from invitation_data can be used here
};

// Generates questions in the format expected by the questionnaire component
const createQuestions = (serviceName: string): Question[] => [
  {
    id: 'service_rating',
    type: 'radio',
    text: `How would you rate the ${serviceName} you received?`,
    options: [
      { id: 'rating-5', value: 'Excellent' },
      { id: 'rating-4', value: 'Good' },
      { id: 'rating-3', value: 'Average' },
      { id: 'rating-2', value: 'Could Be Better' },
      { id: 'rating-1', value: 'Poor' },
    ],
  },
  {
    id: 'service_standout',
    type: 'text',
    text: `What was the best part of your experience with the ${serviceName}?`,
  },
  {
    id: 'service_improvement',
    type: 'text',
    text: `What could we do to improve the ${serviceName} experience?`,
  },
  {
    id: 'recommendation',
    type: 'radio',
    text: `How likely are you to recommend our ${serviceName} to a friend or colleague?`,
    options: [
      { id: 'rec-5', value: 'Very Likely' },
      { id: 'rec-4', value: 'Likely' },
      { id: 'rec-3', value: 'Neutral' },
      { id: 'rec-2', value: 'Unlikely' },
      { id: 'rec-1', value: 'Very Unlikely' },
    ],
  },
  {
    id: 'user_name',
    type: 'text',
    text: 'Finally, what name should we use in your personalized thank you video?',
  },
];

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // 1. Fetch the invitation data from the invite session
    const { data: sessionData, error: sessionError } = await supabase
      .from('endorser_invite_sessions')
      .select('invitation_data')
      .eq('id', token)
      .single();

    if (sessionError || !sessionData) {
      console.error('Error fetching invite session data:', sessionError);
      return NextResponse.json({ error: 'Invalid token or session not found' }, { status: 404 });
    }
    
    const invitationData = (
      typeof sessionData.invitation_data === 'string'
        ? JSON.parse(sessionData.invitation_data)
        : sessionData.invitation_data
    ) as InvitationData;

    const serviceName = invitationData.servicePerformed || 'service';

    // 2. Generate questions in the correct format
    const questions = createQuestions(serviceName);
    const qaData = questions.map(q => ({ ...q, answer: '' }));


    // 3. Save the generated questions back to the endorser_invite_sessions table
    const { error: updateError } = await supabase
      .from('endorser_invite_sessions')
      .update({ questionnaire_data: qaData })
      .eq('id', token);

    if (updateError) {
      console.error('Error updating session with questionnaire data:', updateError);
      return NextResponse.json({ error: 'Failed to save questionnaire' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Questionnaire generated successfully' });

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
