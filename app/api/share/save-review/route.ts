import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
    const { token, reviewText } = await request.json();

    if (!token || reviewText === undefined) {
        return NextResponse.json({ success: false, message: 'Token and reviewText are required.' }, { status: 400 });
    }

    try {
        const { error } = await supabaseAdmin
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
