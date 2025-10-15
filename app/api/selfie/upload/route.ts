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

  const filePath = `selfies/${token}/${file.name}`;

  try {
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

    // Update the endorser_survey_sessions table
    const { error: dbError } = await supabaseAdmin
      .from('endorser_survey_sessions')
      .update({ selfie_public_url: publicUrl })
      .eq('session_id', token);

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
