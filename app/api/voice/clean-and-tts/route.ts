import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { OpenAI } from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

async function parseResponseSafe(res: Response) {
    const text = await res.text().catch(() => '');
    try {
        return { asJson: JSON.parse(text), asText: text };
    } catch {
        return { asJson: null, asText: text };
    }
}

// A simple function to remove filler words. For a more robust solution, a more advanced NLP model could be used.
function cleanTranscript(transcript: string): string {
    const fillerWords = ['uh', 'um', 'uhm', 'hmm', 'you know', 'like', 'so', 'actually', 'basically', 'right'];
    // This regex is a simple approach. It looks for whole words, case-insensitively.
    const regex = new RegExp(`\b(${fillerWords.join('|')})\b`, 'gi');
    return transcript.replace(regex, '').replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();
        if (!token) {
            return NextResponse.json({ success: false, message: 'Missing token.' }, { status: 400 });
        }

        // 1. Fetch session data from Supabase
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('endorser_survey_sessions')
            .select('full_audio_public_url, elevenlabs_voice_id, selected_script')
            .eq('session_id', token)
            .single();

        if (sessionError || !sessionData) {
            return NextResponse.json({ success: false, message: 'Invalid session or missing data.' }, { status: 404 });
        }

        const { full_audio_public_url: fullAudioUrl, elevenlabs_voice_id: voiceId, selected_script: script } = sessionData;

        if (!fullAudioUrl || !script) {
            return NextResponse.json({ error: 'Missing full audio recording or script in session' }, { status: 400 });
        }

        if (!ELEVENLABS_API_KEY || !process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'Server missing required API keys' }, { status: 500 });
        }

        // 2. Transcribe the audio using OpenAI Whisper
        const audioRes = await fetch(fullAudioUrl);
        if (!audioRes.ok) throw new Error('Failed to fetch audio file for transcription.');
        const audioBlob = await audioRes.blob();
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });

        const originalTranscript = transcription.text;

        // 3. Clean the transcript to remove filler words
        const cleanedTranscript = cleanTranscript(originalTranscript);

        if (!cleanedTranscript) {
            throw new Error('Transcription resulted in empty text after cleaning.');
        }

        // 4. Generate new, clean audio using ElevenLabs TTS
        // We use the cloned voice if available, otherwise a default high-quality voice.
        const ttsVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // A default voice if none is cloned
        const ttsUrl = `${ELEVENLABS_BASE_URL}/text-to-speech/${ttsVoiceId}`;

        const ttsRes = await fetch(ttsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: cleanedTranscript,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!ttsRes.ok) {
            const parsed = await parseResponseSafe(ttsRes);
            throw new Error(`ElevenLabs TTS failed: ${parsed.asText}`);
        }

        const ttsAudioBlob = await ttsRes.blob();

        // 5. Upload the generated audio to Supabase
        const generatedAudioPath = `generated-audio/${token}-cleaned.mp3`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from('endorser-assets')
            .upload(generatedAudioPath, ttsAudioBlob, { 
                contentType: 'audio/mpeg', 
                upsert: true 
            });

        if (uploadError) {
            throw new Error(`Failed to upload generated audio: ${uploadError.message}`);
        }

        const { data: signedUrlData } = supabaseAdmin.storage
            .from('endorser-assets')
            .getPublicUrl(generatedAudioPath);

        const generatedAudioUrl = signedUrlData.publicUrl;

        // 6. Update the session with the new generated audio URL
        await supabaseAdmin
            .from('endorser_survey_sessions')
            .update({ generated_audio_url: generatedAudioUrl })
            .eq('session_id', token);

        return NextResponse.json({ success: true, generated_audio_url: generatedAudioUrl });

    } catch (e: any) {
        console.error('Clean and TTS process error:', e);
        return NextResponse.json({ success: false, details: e?.message ?? String(e) }, { status: 500 });
    }
}
