// app/api/consent/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token is required.' }, { status: 400 });
  }

  // In a real app, you would:
  // 1. Validate the token.
  // 2. Record the user's consent in your database (e.g., Supabase 'voice_consents' table).
  console.log(`Voice cloning consent received for token: ${token}`);

  return NextResponse.json({ success: true, message: 'Consent recorded.' });
}
