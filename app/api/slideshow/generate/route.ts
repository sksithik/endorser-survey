// app/api/slideshow/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs'; // ensure Node.js runtime (not edge) so child_process works
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { exec, execFile } from 'child_process';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import os from 'os';
import ffmpegStatic from 'ffmpeg-static';
// Type-only safe imports; provide ambient module declarations if types missing.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - no bundled types
import ffprobeStatic from 'ffprobe-static';
import { Readable } from 'stream';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - no bundled types
import ffmpeg from 'fluent-ffmpeg';

async function downloadFile(url: string, filePath: string): Promise<void> {
    const res = await fetch(url);
    if (!res.body) {
        throw new Error(`Failed to download file from ${url}: body is null`);
    }
    // Convert Web ReadableStream to Node.js Readable for pipeline.
    const nodeStream = Readable.fromWeb(res.body as any);
    await pipeline(nodeStream, fs.createWriteStream(filePath));
}

function resolveFfmpegCandidates(): string[] {
    const list: string[] = [];
    if (process.env.FFMPEG_PATH) list.push(process.env.FFMPEG_PATH);
    if (ffmpegStatic) list.push(ffmpegStatic as string);
    if (process.env.LAMBDA_TASK_ROOT) list.push(path.join(process.env.LAMBDA_TASK_ROOT, 'ffmpeg'));
    list.push('ffmpeg'); // PATH last
    return [...new Set(list.filter(Boolean))];
}

async function pickWorkingFfmpeg(candidates: string[]): Promise<{ path?: string; tried: string[] }> {
    const tried: string[] = [];
    for (const c of candidates) {
        const ok = await new Promise<boolean>(resolve => {
            execFile(c, ['-version'], (err) => {
                tried.push(c);
                resolve(!err);
            });
        });
        if (ok) return { path: c, tried };
    }
    return { path: undefined, tried };
}

function resolveFfprobePath(): string | undefined {
    const probePath = (ffprobeStatic as any)?.path as string | undefined;
    if (probePath && fs.existsSync(probePath)) return probePath;
    return undefined; // will rely on system ffprobe if present
}

async function ensureFfmpegAvailable(): Promise<{ ffmpegPath: string; tried: string[] }> {
    const candidates = resolveFfmpegCandidates();
    const { path: working, tried } = await pickWorkingFfmpeg(candidates);
    if (!working) {
        throw new Error(`ffmpeg is not installed or not executable. Tried: ${tried.join(', ')}. Install (winget install Gyan.FFmpeg | choco install ffmpeg | scoop install ffmpeg) or ensure ffmpeg-static/@ffmpeg-installer is present. Optionally set FFMPEG_PATH env.`);
    }
    return { ffmpegPath: working, tried };
}

export async function POST(req: NextRequest) {
    try {
        const { token, images, texts, audioUrl } = await req.json() as { token: string; images: string[]; texts: string[]; audioUrl?: string };
        if (!token || !images) {
            return NextResponse.json({ success: false, message: 'Missing token or images.' }, { status: 400 });
        }

        // Use OS temp directory for portability (works on Windows, Linux, serverless).
        const tempDir = path.join(os.tmpdir(), 'slideshow');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const imagePaths = await Promise.all(images.map(async (imageUrl: string, i: number) => {
            const imagePath = `${tempDir}/image${i}.jpg`;
            await downloadFile(imageUrl, imagePath);
            return imagePath;
        }));

        const videoPath = `${tempDir}/output.mp4`;
        const defaultDuration = 5; // fallback seconds per image

        // Resolve ffmpeg/ffprobe paths and verify availability early.
        const { ffmpegPath, tried } = await ensureFfmpegAvailable();
        const ffprobePath = resolveFfprobePath();
        if (ffprobePath) {
            ffmpeg.setFfprobePath(ffprobePath);
        }
        // Provide diagnostic info for client if needed.
        console.log('[ffmpeg] using binary:', ffmpegPath, ' (tried order: ', tried.join(', '), ')');
        ffmpeg.setFfmpegPath(ffmpegPath);

        let audioPath: string | undefined;
        let perImageDuration = defaultDuration;
        if (audioUrl) {
            try {
                audioPath = path.join(tempDir, 'audio.mp3');
                await downloadFile(audioUrl, audioPath);
                const audioDuration = await new Promise<number>((resolve, reject) => {
                    ffmpeg.ffprobe(audioPath!, (err: any, data: any) => {
                        if (err) return reject(err);
                        resolve(data?.format?.duration || 0);
                    });
                });
                if (audioDuration > 0) {
                    perImageDuration = audioDuration / imagePaths.length;
                }
            } catch (audioErr: any) {
                console.warn('Audio download/metadata failed; continuing without audio.', audioErr);
                audioPath = undefined;
            }
        }

        // Build concat filelist for variable durations
        const fileListPath = path.join(tempDir, 'filelist.txt');
        const fileListContent = imagePaths.map((p, idx) => {
            const durationLine = idx < imagePaths.length - 1 ? `duration ${perImageDuration.toFixed(3)}` : '';
            return `file '${p}'\n${durationLine}`.trim();
        }).join('\n');
        fs.writeFileSync(fileListPath, fileListContent, 'utf-8');

        // Construct command with proper stream mapping if audio present
        let command: string;
        if (audioPath) {
            command = `${ffmpegPath} -f concat -safe 0 -i "${fileListPath}" -i "${audioPath}" -c:v libx264 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -pix_fmt yuv420p -r 25 -c:a aac -map 0:v -map 1:a -shortest "${videoPath}"`;
        } else {
            command = `${ffmpegPath} -f concat -safe 0 -i "${fileListPath}" -c:v libx264 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -pix_fmt yuv420p -r 25 -movflags +faststart "${videoPath}"`;
        }

        await new Promise<void>((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    if (error.message.includes('is not recognized as an internal or external command')) {
                        reject(new Error('ffmpeg is not installed in the environment. Please install ffmpeg and try again.'));
                    } else {
                        console.error(`ffmpeg error: ${error.message}`);
                        reject(error);
                    }
                    return;
                }
                if (stderr) {
                    console.error(`ffmpeg stderr: ${stderr}`);
                }
                resolve();
            });
        });

    const videoData = fs.readFileSync(videoPath);
        const videoBlob = new Blob([videoData], { type: 'video/mp4' });

        const videoFilePath = `slideshows/${token}.mp4`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from('quotes-bucket')
            .upload(videoFilePath, videoBlob, { upsert: true });

        if (uploadError) {
            throw new Error(`Failed to upload video: ${uploadError.message}`);
        }

        const { data: urlData } = supabaseAdmin.storage
            .from('quotes-bucket')
            .getPublicUrl(videoFilePath);

        const publicUrl = urlData.publicUrl;

        await supabaseAdmin
            .from('endorser_survey_sessions')
            .update({ final_video_url: publicUrl })
            .eq('session_id', token);

        // Clean up temp files
        try {
            imagePaths.forEach(imagePath => fs.unlinkSync(imagePath));
            if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
            if (fs.existsSync(fileListPath)) fs.unlinkSync(fileListPath);
            fs.unlinkSync(videoPath);
        } catch (cleanupErr) {
            console.warn('Cleanup warning (non-fatal):', cleanupErr);
        }

        return NextResponse.json({ success: true, publicUrl });

    } catch (e: any) {
        console.error('Slideshow generation error:', e);
        return NextResponse.json({ success: false, details: e?.message ?? String(e) }, { status: 500 });
    }
}
