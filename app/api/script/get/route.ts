// app/api/script/get/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'token query param required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('endorser_survey_sessions')
      .select('selected_script')
      .eq('session_id', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Row not found
        return NextResponse.json({ success: true, selected_script: null });
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, selected_script: data?.selected_script ?? null });
  } catch (e: any) {
    console.error('Script get error:', e);
    return NextResponse.json({ success: false, message: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
}
