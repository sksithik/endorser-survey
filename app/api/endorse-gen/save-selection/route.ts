import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const { token, chosenActionType, friendName } = await request.json();

    if (!token || !chosenActionType) {
        return NextResponse.json({ success: false, message: 'Token and action type are required.' }, { status: 400 });
    }

    try {
        // We need to update the session with the chosen action.
        // Assuming endorser_invite_sessions has a field for this or we store it in metadata/survey.
        // Let's assume we can store it in a new column or merge into survey json.
        // Merging into survey json is safest if we don't know the schema.

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('endorser_invite_sessions')
            .select('survey')
            .eq('id', token)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
        }

        const updatedSurvey = {
            ...existing.survey,
            chosenActionType,
            friendName
        };

        const { error: updateError } = await supabaseAdmin
            .from('endorser_invite_sessions')
            .update({ survey: updatedSurvey })
            .eq('id', token);

        if (updateError) {
            console.error('Error saving selection:', updateError);
            return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error('Unexpected error saving selection:', e);
        return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
    }
}
