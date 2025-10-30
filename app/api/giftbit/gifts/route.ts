// app/api/giftbit/gifts/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const API_KEY = process.env.GIFTBIT_API_KEY; // rename from GIFTBOT_*
  const BASE = process.env.GIFTBIT_API_BASE_URL
    ?? 'https://api-testbed.giftbit.com/papi/v1'; // use testbed or production

  if (!API_KEY) {
    return NextResponse.json({ error: 'Giftbit API key not configured.' }, { status: 500 });
  }

  try {
    const res = await fetch(`${BASE}/brands`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const ct = res.headers.get('content-type') || '';

    if (!res.ok) {
      const body = ct.includes('application/json') ? await res.json() : await res.text();
      const msg = typeof body === 'string' ? body : body.message || 'Failed to fetch brands from Giftbit.';
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    if (!ct.includes('application/json')) {
      const body = await res.text();
      throw new Error(`Unexpected content-type: ${ct}. Body starts: ${body.slice(0, 200)}`);
    }

    const data = await res.json();

    // data shape varies; normalize conservatively
    const brands = Array.isArray(data?.brands) ? data.brands : Array.isArray(data) ? data : [];
    const giftCards = brands.map((b: any) => {
      const d0 = b?.denominations?.[0] || null; // pick first denomination if present
      const price = d0?.price_in_cents ?? d0?.priceInCents ?? (d0?.value ? d0.value * 100 : null);
      return {
        id: b?.brand_code ?? b?.id ?? b?.code ?? b?.name, // Giftbit often uses brand codes
        name: b?.name ?? b?.display_name ?? 'Unknown',
        points: price != null ? price / 100 : null, // adjust your points logic as needed
        value: d0
          ? `${d0?.currency ?? 'USD'} ${d0?.value ?? price / 100}`
          : null,
        image_url: b?.image_url ?? b?.logo_url ?? null,
      };
    });

    return NextResponse.json(giftCards);
  } catch (err: any) {
    console.error('[Giftbit] /brands failed:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error.' }, { status: 500 });
  }
}
