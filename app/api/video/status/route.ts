import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const SUBMAGIC_API_URL = 'https://api.submagic.co/v1';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id'); // Project ID
        const token = searchParams.get('token'); // Session ID

        if (!id || !token) {
            return NextResponse.json({ success: false, message: 'Missing id or token.' }, { status: 400 });
        }

        const apiKey = process.env.SUBMAGIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'Server configuration error.' }, { status: 500 });
        }

        // 1. Check Status from Submagic
        const response = await fetch(`${SUBMAGIC_API_URL}/projects/${id}`, {
            headers: {
                'X-Api-Key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Submagic status check failed: ${await response.text()}`);
        }

        const data = await response.json();
        // Normalize status and url from response
        // Assuming structure: { status: "completed", exportUrl: "..." } or similar
        const status = data.status || data.data?.status;
        const finalUrl = data.exportUrl || data.videoUrl || data.data?.url;

        // 2. If completed, update Supabase
        if (status === 'completed' && finalUrl) {
            await supabaseAdmin
                .from('endorser_invite_sessions')
                .update({ final_video_url: finalUrl })
                .eq('id', token);
        }

        return NextResponse.json({
            success: true,
            status,
            url: finalUrl,
            progress: data.progress // Pass through progress if available
        });

    } catch (error: any) {
        console.error('Status check error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
