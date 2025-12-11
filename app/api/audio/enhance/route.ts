import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';

export const runtime = 'nodejs';

// Start Adobe API configuration
const ADOBE_API_KEY = process.env.ADOBE_ENHANCE_API_KEY;
const ADOBE_API_ENDPOINT = process.env.ADOBE_ENHANCE_API_ENDPOINT || 'https://api.podcast.adobe.com/v1/enhance';

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ success: false, message: 'Missing token.' }, { status: 400 });
        }

        if (!ADOBE_API_KEY) {
            console.error('Server missing ADOBE_ENHANCE_API_KEY');
            return NextResponse.json({ success: false, message: 'Server configuration error: Adobe Key missing.' }, { status: 500 });
        }

        // 1. Fetch session data to get the raw video URL
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('endorser_invite_sessions')
            .select('video_url')
            .eq('id', token)
            .single();

        if (sessionError || !sessionData?.video_url) {
            return NextResponse.json({ success: false, message: 'Session or video not found.' }, { status: 404 });
        }

        const videoUrl = sessionData.video_url;

        // 2. Download video to temporary file
        const tempDir = os.tmpdir();
        const inputVideoPath = path.join(tempDir, `input-${token}.webm`);
        const outputAudioPath = path.join(tempDir, `encoded-${token}.mp3`); // Adobe often likes mp3/wav
        const enhancedAudioPath = path.join(tempDir, `enhanced-${token}.wav`); // Result is often wav

        // Fetch video buffer
        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) throw new Error('Failed to download video file.');
        const videoBuffer = await videoRes.arrayBuffer();
        fs.writeFileSync(inputVideoPath, Buffer.from(videoBuffer));

        // 3. Extract Audio using FFmpeg
        // We explicitly set the ffmpeg path
        if (ffmpegPath) {
            ffmpeg.setFfmpegPath(ffmpegPath);
        } else {
            throw new Error('FFmpeg binary not found in environment.');
        }

        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputVideoPath)
                .toFormat('mp3')
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outputAudioPath);
        });

        // 4. Send to Adobe Enhance API
        // Note: The specific implementation details of the Adobe Audio Enhance API (File upload vs URL)
        // vary by specific integration. Common pattern is multipart/form-data upload.

        const fileContent = fs.readFileSync(outputAudioPath);
        const formData = new FormData();
        // Using a Blob for the file to append to FormData in node environment might require specific handling or a polyfill if standard FormData isn't sufficient, 
        // but in Next.js 13+ App Router (Node runtime), standard fetch and FormData are available.
        // However, attaching a Buffer directly to FormData in Node can be tricky. 
        // We'll use the 'blob' method if possible, or construct a request body manually if needed.
        // For simplicity with standard fetch:
        const fileBlob = new Blob([fileContent], { type: 'audio/mp3' });
        formData.append('file', fileBlob, 'input.mp3');

        const adobeRes = await fetch(ADOBE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'x-api-key': ADOBE_API_KEY,
                // 'Content-Type': 'multipart/form-data', // Let fetch set boundary
            },
            body: formData
        });

        if (!adobeRes.ok) {
            const errText = await adobeRes.text();
            throw new Error(`Adobe API failed: ${adobeRes.status} ${errText}`);
        }

        // 5. Save enhanced audio
        const enhancedAudioBuffer = await adobeRes.arrayBuffer();
        // Verify it's valid audio by checking size or simple header check if needed, but assuming success.

        const fileName = `enhanced-audio-${Date.now()}.wav`; // Adobe usually returns wav

        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('quotes-bucket') // Reusing existing bucket
            .upload(`audio/${fileName}`, enhancedAudioBuffer, {
                contentType: 'audio/wav',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin
            .storage
            .from('quotes-bucket')
            .getPublicUrl(`audio/${fileName}`);

        const enhancedUrl = publicUrlData.publicUrl;

        // 6. Update session
        await supabaseAdmin
            .from('endorser_invite_sessions')
            .update({ enhanced_audio_url: enhancedUrl })
            .eq('id', token);

        // cleanup temp files
        try {
            fs.unlinkSync(inputVideoPath);
            fs.unlinkSync(outputAudioPath);
        } catch (e) { console.error('Cleanup error', e); }

        return NextResponse.json({ success: true, url: enhancedUrl });

    } catch (error: any) {
        console.error('Audio enhancement error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
