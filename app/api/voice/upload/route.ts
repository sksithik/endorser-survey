import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const token = formData.get('token') as string | null;

    if (!file || !token) {
      return NextResponse.json({ success: false, message: 'Missing file or token.' }, { status: 400 });
    }

    const filePath = `voices/${token}-${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('quotes-bucket')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if file with same name exists
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ success: false, message: 'Failed to upload voice file.' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('quotes-bucket')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      return NextResponse.json({ success: false, message: 'Could not get public URL for the voice file.' }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('endorser_survey_sessions')
      .update({ voice_public_url: urlData.publicUrl })
      .eq('session_id', token);

    if (dbError) {
      console.error('Supabase DB error:', dbError);
      return NextResponse.json({ success: false, message: 'Failed to save voice URL to session.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, publicUrl: urlData.publicUrl });
  } catch (error) {
    console.error('Voice upload error:', error);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
