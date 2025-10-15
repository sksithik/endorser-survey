// app/api/survey/load/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// The standard set of questions, assuming they are constant for this demo.
// In a real app, this might also come from the database based on the business.
const standardQuestions = [
  { id: 1, text: "What was the best part of your experience with us?", type: "textarea" },
  { id: 2, text: "How could we improve our service?", type: "textarea" },
  { id: 3, text: "Would you recommend us to a friend? Why or why not?", type: "textarea" },
  { id: 4, text: "On a scale of 1 to 10, how satisfied are you?", type: "rating" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'Token is required.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('endorser_survey_sessions')
      .select('survey, current_step, intro') // Select all required fields
      .eq('session_id', token)
      .single();

    if (error || !data) {
      console.error('Supabase survey load error:', error);
      return NextResponse.json({ message: 'Invalid session token.' }, { status: 401 });
    }

    let currentStep = data.current_step || 0;
    const maxStep = standardQuestions.length > 0 ? standardQuestions.length - 1 : 0;

    // Clamp the current step to a valid index to prevent crashes
    if (currentStep > maxStep) {
      currentStep = maxStep;
    }

    // Return the survey data, including pre-populated answers and the current step
    return NextResponse.json({
      businessName: data.intro?.heading || "Innovate Inc.", // Get business name from 'intro' field
      questions: standardQuestions,
      answers: data.survey || {}, // Pre-populated answers from the 'survey' field
      currentStep: currentStep, // The user's last saved (and now validated) step
    });

  } catch (e) {
    console.error('Unexpected error loading survey:', e);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}