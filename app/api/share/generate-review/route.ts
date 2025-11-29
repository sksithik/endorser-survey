import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { openai } from '@/lib/openai';

export async function POST(request: Request) {
    const { token } = await request.json();

    if (!token) {
        return NextResponse.json({ success: false, message: 'Token is required.' }, { status: 400 });
    }

    try {
        // Fetch survey answers from endorser_invite_sessions
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('endorser_invite_sessions')
            .select('survey')
            .eq('id', token)
            .single();

        if (sessionError || !sessionData) {
            console.error('Error fetching session:', sessionError);
            return NextResponse.json({ success: false, message: 'Invalid session token.' }, { status: 401 });
        }

        const survey = sessionData.survey;

        // Generate review using OpenAI
        const prompt = `
SYSTEM:
You are a helpful assistant that drafts a positive review based on the user's survey answers.
The review should be natural, authentic, and ready to be posted on a review site.
Do not include any placeholders.
Keep it concise (2-4 sentences).

INPUT:
Survey Answers: ${JSON.stringify(survey, null, 2)}
`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
        });

        const reviewText = completion.choices[0].message.content?.trim() || '';

        return NextResponse.json({ success: true, reviewText });

    } catch (e: any) {
        console.error('Unexpected error generating review:', e);
        return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
    }
}
