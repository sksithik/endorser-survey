// app/api/endorser/generate/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface GenerateBody {
  surveySessionId?: string; // if generating directly from session answers
  responsesId?: string; // if answers already copied to endorser_responses
}

export async function POST(req: Request) {
  const body: GenerateBody = await req.json().catch(() => ({} as any));
  const { surveySessionId, responsesId } = body;
  if (!surveySessionId && !responsesId) {
    return NextResponse.json({ error: 'surveySessionId or responsesId required' }, { status: 400 });
  }
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: auth } = await supabase.auth.getUser();
  const authedUserId = auth?.user?.id;
  if (!authedUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let answers: any = {};
  if (surveySessionId) {
    const { data, error } = await supabase
      .from('endorser_survey_sessions')
      .select('survey')
      .eq('session_id', surveySessionId)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    answers = data.survey || {};
  } else if (responsesId) {
    const { data, error } = await supabase
      .from('endorser_responses')
      .select('answers')
      .eq('id', responsesId)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Responses not found' }, { status: 404 });
    answers = data.answers || {};
  }

  // Simple templated generation
  const bestPart = answers['1'] || answers['best'] || 'the team was helpful';
  const improvement = answers['2'] || 'n/a';
  const recommendation = answers['3'] || 'I would absolutely recommend them';
  const satisfaction = answers['4'] || '10';

  const draftReview = `I had a ${bestPart} experience. They could improve ${improvement}. ${recommendation}. Overall satisfaction: ${satisfaction}/10.`;

  const videoScript = [
    'Problem: Briefly describe what you were struggling with before.',
    `Solution: Explain how this company helped (${bestPart}).`,
    'Outcome: Share the results you saw.',
    `Who it's for: "If you're looking for X, I'd recommend them because ${recommendation}."`,
  ].join('\n\n');

  const referralEmail = `Subject: Quick recommendation\n\nHey friend,\n\nI used this service and ${bestPart}. Thought you might find it helpful if you need similar help. If you want an intro let me know!\n\n– Your Name`;

  return NextResponse.json({
    draftReview,
    videoScript,
    referralEmail,
    sourceAnswers: answers,
  });
}
