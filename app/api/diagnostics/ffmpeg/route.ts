// app/api/diagnostics/ffmpeg/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ffmpegStatic from 'ffmpeg-static';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export const runtime = 'nodejs';

function candidates(): string[] {
  const list: string[] = [];
  if (process.env.FFMPEG_PATH) list.push(process.env.FFMPEG_PATH);
  if (ffmpegStatic) list.push(ffmpegStatic as string);
  if (ffmpegInstaller?.path) list.push(ffmpegInstaller.path);
  if (process.env.LAMBDA_TASK_ROOT) list.push(path.join(process.env.LAMBDA_TASK_ROOT, 'ffmpeg'));
  list.push('ffmpeg');
  return [...new Set(list.filter(Boolean))];
}

function checkExists(p: string): boolean {
  if (p === 'ffmpeg') return true; // rely on PATH
  try { return fs.existsSync(p); } catch { return false; }
}

async function probe(bin: string): Promise<{ ok: boolean; version?: string; error?: string }> {
  return new Promise(resolve => {
    execFile(bin, ['-version'], (err, stdout) => {
      if (err) return resolve({ ok: false, error: err.message });
      const firstLine = stdout?.toString().split(/\r?\n/)[0] || '';
      resolve({ ok: true, version: firstLine });
    });
  });
}

export async function GET() {
  const list = candidates();
  const results = [] as Array<{ candidate: string; exists: boolean; ok: boolean; version?: string; error?: string }>;
  for (const c of list) {
    const exists = checkExists(c);
    const { ok, version, error } = await probe(c);
    results.push({ candidate: c, exists, ok, version, error });
  }
  const chosen = results.find(r => r.ok)?.candidate || null;
  return NextResponse.json({ success: true, chosen, results });
}
