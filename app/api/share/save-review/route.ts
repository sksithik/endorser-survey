import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    const { token, reviewText } = await request.json();

    if (!token || reviewText === undefined) {
        return NextResponse.json({ success: false, message: 'Token and reviewText are required.' }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from('endorser_invite_sessions')
            .update({ ai_generated_review: reviewText })
            .eq('id', token);

        if (error) {
            console.error('Supabase save review error:', error);
            return NextResponse.json({ success: false, message: 'Failed to save review.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Review saved.' });

    } catch (e: any) {
        console.error('Unexpected error saving review:', e);
        return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
    }
}
