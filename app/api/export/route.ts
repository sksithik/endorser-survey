// app/api/export/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const type = searchParams.get('type'); // 'video' or 'caption'

  if (!videoId || !type) {
    return NextResponse.json({ message: 'videoId and type are required.' }, { status: 400 });
  }

  // In a real app, you would:
  // 1. Validate the videoId and user permissions.
  // 2. Fetch the video URL or caption data from your database (e.g., Supabase 'videos' table).

  if (type === 'video') {
    // For video, you would redirect to the actual video file URL in your storage.
    const videoUrl = `https://mock-supabase-url.com/final_videos/${videoId}.mp4`;
    return NextResponse.redirect(videoUrl);
  }

  if (type === 'caption') {
    // For captions, you would return the caption file content.
    const srtContent = `1
00:00:01,000 --> 00:00:05,000
This is a mock subtitle file for video ${videoId}.

2
00:00:06,000 --> 00:00:10,000
In a real application, this would be the generated .srt content.
`;
    return new Response(srtContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${videoId}.srt"`,
      },
    });
  }

  return NextResponse.json({ message: 'Invalid export type.' }, { status: 400 });
}
