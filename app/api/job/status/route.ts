// app/api/job/status/route.ts
import { NextResponse } from 'next/server';

const jobStatuses = [
    { status: 'Processing', message: 'Cleaning up audio...' },
    { status: 'Enhancing', message: 'Improving video quality...' },
    { status: 'Enhancing', message: 'Generating subtitles...' },
    { status: 'Ready', message: 'Your video is ready!' },
];

// In-memory store for job progress (for demo purposes)
const jobProgress: Record<string, number> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Job ID is required.' }, { status: 400 });
  }

  if (!jobProgress[id]) {
    jobProgress[id] = 0;
  }

  const statusIndex = jobProgress[id];
  const jobStatus = jobStatuses[statusIndex];

  // Increment progress for the next poll
  if (statusIndex < jobStatuses.length - 1) {
    jobProgress[id]++;
  }

  return NextResponse.json(jobStatus);
}
