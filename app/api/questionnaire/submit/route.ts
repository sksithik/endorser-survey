import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const { token, answers } = await request.json();

    if (!token || !answers) {
        return NextResponse.json({ success: false, message: 'Token and answers are required.' }, { status: 400 });
    }

    try {
        // Upsert into endorser_survey_sessions
        // We assume session_id is the token.
        // We also need to ensure we don't lose existing data if we update.

        // First check if it exists
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('endorser_survey_sessions')
            .select('id')
            .eq('session_id', token)
            .single();

        let error;
        if (existing) {
            const { error: updateError } = await supabaseAdmin
                .from('endorser_survey_sessions')
                .update({ survey: answers })
                .eq('session_id', token);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseAdmin
                .from('endorser_survey_sessions')
                .insert({ session_id: token, survey: answers });
            error = insertError;
        }

        if (error) {
            console.error('Error saving survey:', error);
            return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error('Unexpected error saving survey:', e);
        return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
    }
}
