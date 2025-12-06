import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const SUBMAGIC_API_URL = 'https://api.submagic.co/v1';

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ success: false, message: 'Missing token.' }, { status: 400 });
        }

        const apiKey = process.env.SUBMAGIC_API_KEY;
        if (!apiKey) {
            console.error('Server missing SUBMAGIC_API_KEY');
            return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
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

        // 2. Create Project in Submagic
        // Docs: https://docs.submagic.co/reference/create-project
        const payload: any = {
            videoUrl: videoUrl,
            title: `Endorser Session ${token}`,
            language: 'english',
            templateName: 'hormozi', // Default template
            // magicZoom: true, // Optional: Enable auto-zooms
            // magicBrolls: false, // Optional: Enable b-rolls
        };

        // Note: Intro/Outro/Logo are best handled via a Submagic Theme.
        // If the user provides a Theme ID, we can use it:
        if (process.env.SUBMAGIC_THEME_ID) {
            payload.userThemeId = process.env.SUBMAGIC_THEME_ID;
        }

        const response = await fetch(`${SUBMAGIC_API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Submagic API Error:', errorText);
            throw new Error(`Submagic creation failed: ${errorText}`);
        }

        const data = await response.json();
        // Assuming response structure { data: { projectId: "..." } } or similar
        const projectId = data.projectId || data.data?.projectId || data.id;

        if (!projectId) {
            throw new Error('No Project ID returned from Submagic');
        }

        return NextResponse.json({ success: true, projectId });

    } catch (error: any) {
        console.error('Video processing error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
