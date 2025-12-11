import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AssemblyAI } from 'assemblyai';

export const runtime = 'nodejs';

// Initialize AssemblyAI
const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ success: false, message: 'Missing token.' }, { status: 400 });
        }

        if (!process.env.ASSEMBLYAI_API_KEY) {
            console.error('Server missing ASSEMBLYAI_API_KEY');
            return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
        }

        // 1. Fetch session data
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('endorser_invite_sessions')
            .select('video_url, enhanced_audio_url')
            .eq('id', token)
            .single();

        if (sessionError || (!sessionData?.video_url && !sessionData?.enhanced_audio_url)) {
            return NextResponse.json({ success: false, message: 'Session or media not found.' }, { status: 404 });
        }

        // Prefer enhanced audio if available, otherwise fallback to video
        const mediaUrl = sessionData.enhanced_audio_url || sessionData.video_url;

        // 2. Submit for Transcription
        // We'll use the 'transcribe' method which handles polling automatically for simplicity in this V1.
        // Ideally for long files we'd use webhooks, but for short teleprompter videos, waiting is acceptable (usually < 30s).

        const transcript = await client.transcripts.transcribe({
            audio: mediaUrl,
            speaker_labels: false, // Simple transcription for now
        });

        if (transcript.status === 'error') {
            throw new Error(transcript.error);
        }

        // 3. Save transcript to Supabase
        // We'll save the text and the full JSON response just in case
        const text = transcript.text;
        const json = JSON.stringify(transcript);

        const { error: updateError } = await supabaseAdmin
            .from('endorser_invite_sessions')
            .update({
                transcription: text,
                // If you have a column for JSON details, add it here: transcription_details: transcript
            })
            .eq('id', token);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, text });

    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
