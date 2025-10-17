import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs'

const HEYGEN_BASE = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

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
            .select('selfie_public_url, generated_audio_url, selected_script')
            .eq('session_id', token)
            .single();

        if (sessionError || !sessionData) {
            return NextResponse.json({ success: false, message: 'Invalid session or missing data.' }, { status: 404 });
        }

        const { selfie_public_url: selfieUrl, generated_audio_url: generatedAudioUrl, selected_script: script } = sessionData;

        if (!selfieUrl || !generatedAudioUrl || !script) {
            return NextResponse.json({ error: 'Missing selfie, generated audio, or script in session' }, { status: 400 });
        }

        const heygenApiKey = process.env.HEYGEN_API_KEY;
        if (!heygenApiKey) {
            return NextResponse.json({ error: 'Server missing HEYGEN_API_KEY' }, { status: 500 });
        }

        // 2. Get HeyGen image_key for the selfie
        const selfieRes = await fetch(selfieUrl);
        if (!selfieRes.ok) throw new Error('Failed to fetch selfie file.');
        const selfieBlob = await selfieRes.blob();
        const selfieContentType = selfieRes.headers.get('content-type') || 'image/jpeg';

        const upRes = await fetch('https://upload.heygen.com/v1/asset', {
            method: 'POST',
            headers: { 'X-Api-Key': heygenApiKey, 'Content-Type': selfieContentType },
            body: selfieBlob,
        });
        const upParsed = await parseResponseSafe(upRes);
        if (!upRes.ok) {
            throw new Error(`HeyGen asset upload failed: ${upParsed.asText}`);
        }
        const image_key = upParsed.asJson?.data?.image_key;
        if (!image_key) throw new Error('HeyGen upload succeeded but no image_key returned');

        // 3. Generate the final video with the selfie and the generated speech
        const video_title = `Endorser - ${script.substring(0, 32)}${script.length > 32 ? '…' : ''}`;
        const av4Payload = {
            image_key: image_key,
            video_title: video_title,
            audio_url: generatedAudioUrl,
            gender: "male",
            video_orientation: 'portrait',
            test: true,
        };
        const av4Url = `${HEYGEN_BASE}/v2/video/av4/generate`;
        const genRes = await fetch(av4Url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': heygenApiKey },
            body: JSON.stringify(av4Payload),
        });

        const genParsed = await parseResponseSafe(genRes);
        if (!genRes.ok) {
            throw new Error(`HeyGen video generation failed: ${genParsed.asText}`);
        }

        const videoId = genParsed.asJson?.data?.video_id;
        if (!videoId) throw new Error('HeyGen did not return a video_id.');

        return NextResponse.json({ success: true, id: videoId, attempt: 'clone-tts-av4' });

    } catch (e: any) {
        console.error('HeyGen process error:', e);
        return NextResponse.json({ error: 'Failed to create HeyGen video', details: e?.message ?? String(e) }, { status: 500 });
    }
}

// The GET handler remains for polling.
export async function GET(req: NextRequest) {
    try {
        const key = process.env.HEYGEN_API_KEY
        if (!key) return NextResponse.json({ error: 'Server missing HEYGEN_API_KEY' }, { status: 500 })
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const token = searchParams.get('token');

        if (!id || !token) return NextResponse.json({ error: 'Missing id or token' }, { status: 400 })

        const r = await fetch(`${HEYGEN_BASE}/v1/video_status.get?video_id=${encodeURIComponent(id)}`, { headers: { 'x-api-key': key } });
        const parsed = await parseResponseSafe(r);
        const data = parsed.asJson || {};

        if (r.ok) {
            const status = data?.data?.status || data?.status;
            const url = data?.data?.video_url || data?.video_url;
            const errObj = data?.data?.error || data?.error;

            if (status === 'completed' && url) {
                await supabaseAdmin
                    .from('endorser_survey_sessions')
                    .update({ final_video_url: url })
                    .eq('session_id', token);
            }

            const payload: any = { status, url };
            if (status === 'failed' || status === 'error') {
                payload.error = { code: errObj?.code, message: errObj?.message };
            }
            return NextResponse.json(payload);
        }
        return NextResponse.json({ error: 'HeyGen poll failed', details: parsed.asText }, { status: 502 });
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to poll HeyGen video', details: e?.message ?? String(e) }, { status: 500 })
    }
}