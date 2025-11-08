// app/api/giftbit/redeem/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  // Never trust client-provided userId/pointsCost
  const body = await req.json().catch(() => ({}));
  const { cardId } = body as { cardId?: string }; // string is safer (brand code / product id)

  const API_KEY = process.env.GIFTBIT_API_KEY;
  const BASE = process.env.GIFTBIT_API_BASE_URL ?? 'https://api-testbed.giftbit.com/papi/v1';
  const CAMPAIGN_UUID = process.env.GIFTBIT_CAMPAIGN_UUID ?? undefined;

  if (!API_KEY) {
    return NextResponse.json({ error: 'Giftbit API key not configured.' }, { status: 500 });
  }
  if (!cardId) {
    return NextResponse.json({ error: 'cardId is required.' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient<Database>({ cookies });

  // Get authenticated user (don’t trust posted userId)
  const { data: auth } = await supabase.auth.getUser();
  const authedUserId = auth?.user?.id ?? null;
  if (!authedUserId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // Load user row (points + email to deliver reward)
  const { data: userRow, error: userErr } = await supabase
    .from('endorser_users')
    .select('id, total_points, email')
    .eq('id', authedUserId)
    .single();

  if (userErr || !userRow) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // IMPORTANT: Derive cost server-side (don’t accept from client).
  // You can map cardId -> denomination from your own table or from Giftbit /brands cached server-side.
  // For now, assume a fixed denomination (example: 10 USD).
  const denominationDollars = 10; // TODO: look up real denomination for cardId
  const priceInCents = denominationDollars * 100;

  if ((userRow.total_points ?? 0) < denominationDollars) {
    return NextResponse.json({ error: 'Insufficient points.' }, { status: 403 });
  }

  // Idempotency to avoid double-issuing gifts on retries
  const idemKey = `redeem:${authedUserId}:${cardId}:${Math.floor(Date.now() / 1000)}`;

  // OPTIONAL: wrap points check & decrement in a DB-side transaction (RPC) for atomicity.
  // Example (create this SQL function in Supabase):
  //   SELECT redeem_points(_user_id uuid, _points int, _reason text, _card_id text, _idem text)
  // that checks balance, logs an event, and decrements in one transaction, deduping on idem.
  // For now, do a naive update (non-atomic); replace with RPC soon.
  const newTotalPoints = (userRow.total_points ?? 0) - denominationDollars;

  // Build Giftbit payload.
  // NOTE: Field names vary based on account setup. Keep your original fields if they work in your tenant,
  // but ensure BASE points at /papi/v1 and include a recipient or link-delivery.
  // Safe access to auth.user which might be null
  const recipientEmail = userRow.email ?? (auth?.user?.email ?? undefined);

  const payload: Record<string, any> = {
    campaign_uuid: CAMPAIGN_UUID,               // optional, if using a specific campaign
    marketplace_product_id: cardId,             // if your catalog uses marketplace product ids
    price_in_cents: priceInCents,
  };

  if (recipientEmail) {
    payload.recipient = { email: recipientEmail };
  } else {
    // alternatively, request a link-type reward if you don’t have an email
    payload.delivery_method = 'link'; // check your account’s expected flag
  }

  let gbRes: Response;
  try {
    gbRes = await fetch(`${BASE}/gifts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey, // supported by many APIs; safe to set
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Giftbit network error: ${e?.message || e}` }, { status: 502 });
  }

  const ct = gbRes.headers.get('content-type') || '';
  const gbBody = ct.includes('application/json') ? await gbRes.json() : await gbRes.text();

  if (!gbRes.ok) {
    const msg = typeof gbBody === 'string' ? gbBody : gbBody?.message || 'Giftbit rejected the request.';
    return NextResponse.json({ error: msg }, { status: gbRes.status });
  }

  // Persist redemption result + deduct points (replace with atomic RPC ASAP)
  const { error: updErr } = await supabase
    .from('endorser_users')
    .update({ total_points: newTotalPoints })
    .eq('id', authedUserId);

  // Log reward event regardless, so you have traceability / reconciliation
  await supabase.from('reward_events').insert({
    user_id: authedUserId,
    action: 'redeem',
    points: -denominationDollars,
    // Optionally store Giftbit gift id / details:
    // metadata: gbBody,  // add a jsonb column if you want
  } as any);

  // Point transaction record (deduction)
  await supabase.from('point_transactions').insert({
    user_id: authedUserId,
    delta: -denominationDollars,
    balance_after: newTotalPoints,
    reason: `Redeemed gift card ${cardId}`,
    metadata: { giftbit: typeof gbBody === 'string' ? undefined : gbBody },
  } as any);

  if (updErr) {
    // Consider compensating action: flag for manual review; don’t try auto-cancel the gift unless your flow supports it.
    return NextResponse.json({
      error: 'Gift issued but failed to update points. Support will reconcile your balance.',
    }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Gift card redeemed successfully!',
    newTotalPoints,
    giftbit: typeof gbBody === 'string' ? undefined : gbBody, // include a small subset if useful
  });
}
