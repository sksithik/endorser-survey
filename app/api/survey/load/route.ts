// app/api/survey/load/route.ts
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
      .select('questions, survey, current_step, intro') // Ensure 'questions' is selected
      .eq('id', token)
      .single();

    if (error || !data) {
      console.error('Supabase survey load error:', error);
      return NextResponse.json({ message: 'Invalid session token.' }, { status: 401 });
    }

    const questions = Array.isArray(data.questions) ? data.questions : [];
    let currentStep = data.current_step || 0;

    // Validate currentStep against the actual dynamic questions length
    const maxStep = questions.length > 0 ? questions.length - 1 : 0;
    if (currentStep > maxStep) {
      currentStep = maxStep;
    }

    // Return the survey data with the correct dynamic questions
    return NextResponse.json({
      businessName: data.intro?.heading || "Innovate Inc.",
      questions: questions, // Use the dynamic questions from the database
      answers: data.survey || {}, // 'survey' field contains the answers
      currentStep: currentStep,
    });

  } catch (e) {
    console.error('Unexpected error loading survey:', e);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}