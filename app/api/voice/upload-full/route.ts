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

    // Save to a different path to distinguish from clone samples
    const filePath = `full-recordings/${token}-${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('endorser-assets') // Assuming the same bucket is used
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if file with same name exists
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ success: false, message: 'Failed to upload full audio file.' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('endorser-assets')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      return NextResponse.json({ success: false, message: 'Could not get public URL for the audio file.' }, { status: 500 });
    }

    // Update the new column in the database
    const { error: dbError } = await supabaseAdmin
      .from('endorser_survey_sessions')
      .update({ full_audio_public_url: urlData.publicUrl })
      .eq('session_id', token);

    if (dbError) {
      console.error('Supabase DB error:', dbError);
      return NextResponse.json({ success: false, message: 'Failed to save full audio URL to session.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, publicUrl: urlData.publicUrl });
  } catch (error) {
    console.error('Full audio upload error:', error);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
