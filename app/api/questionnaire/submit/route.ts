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

        // Award 100 points for completing the questionnaire
        // We need to update the invite session, not the survey session
        try {
            const { error: pointsError } = await (supabaseAdmin as any)
                .from('endorser_invite_sessions')
                .rpc('increment_points', { row_id: token, amount: 100 });

            // Fallback if RPC doesn't exist or fails, try direct update (less safe for concurrency but okay here)
            if (pointsError) {
                console.warn('RPC increment_points failed, trying direct update. Error:', pointsError);
                const { data: currentSession, error: fetchError } = await supabaseAdmin
                    .from('endorser_invite_sessions')
                    .select('points')
                    .eq('id', token)
                    .single();

                if (fetchError) {
                    console.warn('Failed to fetch current points:', fetchError);
                } else if (currentSession) {
                    const { error: updateError } = await supabaseAdmin
                        .from('endorser_invite_sessions')
                        .update({ points: (currentSession.points || 0) + 100 })
                        .eq('id', token);

                    if (updateError) {
                        console.warn('Failed to update points directly:', updateError);
                    }
                }
            }
        } catch (pointsException) {
            console.error('Exception trying to award points:', pointsException);
            // Do not fail the request if points fail
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error('Unexpected error saving survey:', e);
        // Log the full error object if possible
        if (e?.message) console.error('Error message:', e.message);
        if (e?.stack) console.error('Error stack:', e.stack);
        return NextResponse.json({ success: false, message: 'An unexpected error occurred: ' + (e.message || String(e)) }, { status: 500 });
    }
}
