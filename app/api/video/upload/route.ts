// app/api/video/upload/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const { token, fileName, contentType } = await request.json();

  if (!token || !fileName || !contentType) {
    return NextResponse.json({ success: false, message: 'token, fileName, and contentType are required.' }, { status: 400 });
  }

  // Create a unique, secure path for the upload based on the user's session token
  let filePath = `${token}/${fileName}`;

  try {
    // Attempt to resolve user_id from the token (which is the session_id)
    const { data: session } = await supabaseAdmin
      .from('endorser_invite_sessions')
      .select('user_id')
      .eq('id', token)
      .single();

    if (session?.user_id) {
      filePath = `${session.user_id}/recordings/${fileName}`;
    } else {
      console.warn(`Could not find user_id for token ${token}, falling back to token-based path.`);
    }

    // Use the admin client to create a signed URL. This bypasses RLS.
    const { data, error } = await supabaseAdmin.storage
      .from('quotes-bucket') // Using the bucket name from your teleprompter code
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error('Error creating signed upload URL:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...data });

  } catch (e) {
    console.error('Unexpected error creating signed URL:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}