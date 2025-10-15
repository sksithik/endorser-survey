// app/api/survey/complete/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { token, answers } = await request.json();

  if (!token || !answers) {
    return NextResponse.json({ success: false, message: 'Token and answers are required.' }, { status: 400 });
  }

  // In a real app, you would:
  // 1. Validate the token.
  // 2. Save the answers to your database (e.g., Supabase 'feedback_responses' table).
  // 3. Trigger a background job for script generation.
  console.log(`Survey completed with token: ${token}`);
  console.log('Answers:', answers);

  return NextResponse.json({ success: true, message: 'Survey completed. Script generation started.' });
}
