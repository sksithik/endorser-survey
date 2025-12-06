// app/api/selfie/upload/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = formData.get('token') as string;
  const file = formData.get('file') as File;

  if (!token || !file) {
    return NextResponse.json({ success: false, message: 'Token and file are required.' }, { status: 400 });
  }

  let filePath = `selfies/${token}/${file.name}`;

  try {
    // Attempt to resolve user_id from the token (which is the id)
    const { data: session } = await supabaseAdmin
      .from('endorser_invite_sessions')
      .select('user_id')
      .eq('id', token)
      .single();

    if (session?.user_id) {
      filePath = `${session.user_id}/selfies/${file.name}`;
    } else {
      console.warn(`Could not find user_id for token ${token}, falling back to token-based path.`);
    }

    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('quotes-bucket')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading selfie:', uploadError);
      return NextResponse.json({ success: false, message: uploadError.message }, { status: 500 });
    }

    // Get the public URL of the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from('quotes-bucket')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update the endorser_invite_sessions table
    const { error: dbError } = await supabaseAdmin
      .from('endorser_invite_sessions')
      .update({ selfie_public_url: publicUrl })
      .eq('id', token);

    if (dbError) {
      console.error('Error updating database:', dbError);
      // It might be good to delete the uploaded file here if the DB update fails
      return NextResponse.json({ success: false, message: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, publicUrl });

  } catch (e) {
    console.error('Unexpected error uploading selfie:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
