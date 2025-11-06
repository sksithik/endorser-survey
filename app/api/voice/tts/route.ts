// app/api/voice/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

export async function POST(req: NextRequest) {
    try {
        const { token, script } = await req.json();
        if (!token || !script) {
            return NextResponse.json({ success: false, message: 'Missing token or script.' }, { status: 400 });
        }

        if (!ELEVENLABS_API_KEY) {
            return NextResponse.json({ error: 'Server missing ELEVENLABS_API_KEY' }, { status: 500 });
        }

        // 1. Generate new, clean audio using ElevenLabs TTS
        const ttsVoiceId = '21m00Tcm4TlvDq8ikWAM'; // A default voice
        const ttsUrl = `${ELEVENLABS_BASE_URL}/text-to-speech/${ttsVoiceId}`;

        const ttsRes = await fetch(ttsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: script,
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

        // 2. Upload the generated audio to Supabase
        const generatedAudioPath = `generated-audio/${token}-cleaned.mp3`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from('quotes-bucket')
            .upload(generatedAudioPath, ttsAudioBlob, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (uploadError) {
            throw new Error(`Failed to upload generated audio: ${uploadError.message}`);
        }

        const { data: signedUrlData } = supabaseAdmin.storage
            .from('quotes-bucket')
.getPublicUrl(generatedAudioPath);

        const generatedAudioUrl = signedUrlData.publicUrl;

        // 3. Update the session with the new generated audio URL
        await supabaseAdmin
            .from('endorser_survey_sessions')
            .update({ generated_audio_url: generatedAudioUrl })
            .eq('session_id', token);

        return NextResponse.json({ success: true, generated_audio_url: generatedAudioUrl });

    } catch (e: any) {
        console.error('TTS process error:', e);
        return NextResponse.json({ success: false, details: e?.message ?? String(e) }, { status: 500 });
    }
}
