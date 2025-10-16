import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io';

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
        const { token } = await req.json();
        if (!token) {
            return NextResponse.json({ success: false, message: 'Missing token.' }, { status: 400 });
        }

        // 1. Fetch session data from Supabase
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('endorser_survey_sessions')
            .select('voice_public_url, selected_script')
            .eq('session_id', token)
            .single();

        if (sessionError || !sessionData) {
            return NextResponse.json({ success: false, message: 'Invalid session or missing data.' }, { status: 404 });
        }

        const { voice_public_url: recordedVoiceUrl, selected_script: script } = sessionData;

        if (!recordedVoiceUrl || !script) {
            return NextResponse.json({ error: 'Missing recorded voice or script in session' }, { status: 400 });
        }

        const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
        if (!elevenlabsApiKey) {
            return NextResponse.json({ error: 'Server missing ELEVENLABS_API_KEY' }, { status: 500 });
        }

        // 2. Download the user's recorded voice from Supabase
        const voiceRes = await fetch(recordedVoiceUrl);
        if (!voiceRes.ok) throw new Error('Failed to fetch recorded voice file.');
        const voiceBlob = await voiceRes.blob();

        // 3. Upload voice to ElevenLabs to create a voice clone
        const formData = new FormData();
        formData.append('name', `EndorserVoice_${token}`);
        formData.append('files', voiceBlob, 'user_voice.webm');
        
        const addVoiceRes = await fetch(`${ELEVENLABS_BASE}/v1/voices/add`, {
            method: 'POST',
            headers: { 'xi-api-key': elevenlabsApiKey },
            body: formData,
        });

        const addVoiceParsed = await parseResponseSafe(addVoiceRes);
        if (!addVoiceRes.ok) {
            console.error("ElevenLabs add voice failed:", addVoiceParsed.asText);
            return NextResponse.json({ success: false, error: 'Failed to create voice clone with ElevenLabs', details: addVoiceParsed.asText }, { status: 502 });
        }
        const newVoiceId = addVoiceParsed.asJson?.voice_id;
        if (!newVoiceId) throw new Error('ElevenLabs did not return a voice_id.');

        // 4. Use the new voice to generate speech from the script
        const ttsRes = await fetch(`${ELEVENLABS_BASE}/v1/text-to-speech/${newVoiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenlabsApiKey,
            },
            body: JSON.stringify({ text: script }),
        });

        if (!ttsRes.ok) {
            const errorBody = await ttsRes.text();
            console.error("ElevenLabs TTS failed:", errorBody);
            return NextResponse.json({ success: false, error: 'Failed to generate speech with ElevenLabs', details: errorBody }, { status: 502 });
        }
        const generatedAudioBlob = await ttsRes.blob();

        // 5. Upload the generated speech audio to Supabase
        const generatedAudioPath = `generated_audio/${token}-tts.mp3`;
        const { error: audioUploadError } = await supabaseAdmin.storage
            .from('quotes-bucket')
            .upload(generatedAudioPath, generatedAudioBlob, { upsert: true });
        if (audioUploadError) throw audioUploadError;

        const { data: generatedAudioUrlData } = supabaseAdmin.storage.from('quotes-bucket').getPublicUrl(generatedAudioPath);
        const generatedAudioUrl = generatedAudioUrlData.publicUrl;

        // 6. Save the new URL to the session table
        const { error: dbError } = await supabaseAdmin
            .from('endorser_survey_sessions')
            .update({ generated_audio_url: generatedAudioUrl })
            .eq('session_id', token);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, generatedAudioUrl });

    } catch (e: any) {
        console.error('Clone and TTS process error:', e);
        return NextResponse.json({ success: false, error: 'Failed to clone voice and generate audio', details: e?.message ?? String(e) }, { status: 500 });
    }
}
