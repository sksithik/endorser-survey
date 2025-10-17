import { NextRequest, NextResponse } from 'next/server';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function GET(req: NextRequest) {
    if (!UNSPLASH_ACCESS_KEY) {
        return NextResponse.json({ success: false, message: 'Unsplash API key is not configured on the server.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ success: false, message: 'Search query is required.' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Unsplash API error:', errorData);
            return NextResponse.json({ success: false, message: 'Failed to fetch images from Unsplash.', details: errorData }, { status: response.status });
        }

        const data = await response.json();
        
        const images = data.results.map((image: any) => ({
            id: image.id,
            url: image.urls.regular, // 'regular' size is good for web display
            alt: image.alt_description,
            user: {
                name: image.user.name,
                link: image.user.links.html,
            },
        }));

        return NextResponse.json({ success: true, images });

    } catch (error: any) {
        console.error('Error fetching from Unsplash:', error);
        return NextResponse.json({ success: false, message: 'An unexpected error occurred while fetching images.', details: error.message }, { status: 500 });
    }
}
