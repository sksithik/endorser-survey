// app/api/referral/closed-won/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { pointsToUsd } from '@/lib/rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ClosedWonBody {
  referralId: string;
  targetBountyPoints?: number; // override target if not already set
}

export async function POST(req: Request) {
  const body: ClosedWonBody = await req.json().catch(() => ({} as any));
  const { referralId, targetBountyPoints } = body;
  if (!referralId) return NextResponse.json({ error: 'referralId required' }, { status: 400 });

  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: auth } = await supabase.auth.getUser();
  const authedUserId = auth?.user?.id;
  if (!authedUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Load referral
  const { data: refRow, error: refErr } = await supabase
    .from('referrals')
    .select('id, referrer_user_id, bounty_points_target, bounty_points_awarded, lead_status')
    .eq('id', referralId)
    .single();
  if (refErr || !refRow) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
  if (refRow.referrer_user_id !== authedUserId) {
    // In admin scenario you would allow; for simplicity restrict to referrer or admin check
    // TODO: implement admin role bypass
  }

  // Update referral status to closed_won and set target bounty if provided
  const bountyTarget = targetBountyPoints ?? refRow.bounty_points_target ?? 5000; // default 5k points = $50
  const alreadyAwarded = refRow.bounty_points_awarded ?? 0;
  const topUp = Math.max(0, bountyTarget - alreadyAwarded);
  if (topUp === 0) {
    // Nothing to award
    await supabase.from('referrals').update({ lead_status: 'closed_won' }).eq('id', referralId);
    return NextResponse.json({ message: 'Referral already fully awarded', bountyTarget, alreadyAwarded });
  }

  // Fetch referrer balance
  const { data: userRow } = await supabase
    .from('endorser_users')
    .select('id, total_points')
    .eq('id', refRow.referrer_user_id)
    .single();
  if (!userRow) return NextResponse.json({ error: 'Referrer user missing' }, { status: 404 });

  const newBalance = (userRow.total_points ?? 0) + topUp;

  // Insert reward_event for top-up
  const { data: rewardEvent, error: rewardErr } = await supabase
    .from('reward_events')
    .insert({
      user_id: refRow.referrer_user_id,
      action: 'referral_topup',
      source: 'referral',
      points: topUp,
      usd_value: pointsToUsd(topUp),
      metadata: { referralId, bountyTarget, alreadyAwarded },
    } as any)
    .select('id')
    .single();
  if (rewardErr || !rewardEvent) return NextResponse.json({ error: 'Failed to log reward event' }, { status: 500 });

  // Update user balance & referral row
  await supabase.from('endorser_users').update({ total_points: newBalance }).eq('id', refRow.referrer_user_id);
  await supabase.from('referrals').update({
    lead_status: 'closed_won',
    closed_won_at: new Date().toISOString(),
    bounty_points_target: bountyTarget,
    bounty_points_awarded: alreadyAwarded + topUp,
  }).eq('id', referralId);

  // Point transaction record
  await supabase.from('point_transactions').insert({
    user_id: refRow.referrer_user_id,
    delta: topUp,
    balance_after: newBalance,
    reward_event_id: rewardEvent.id,
    reason: 'Referral closed won bounty top-up',
    metadata: { referralId },
  } as any);

  return NextResponse.json({
    message: 'Referral closed-won processed',
    referralId,
    topUp,
    bountyTarget,
    newBalance,
  });
}
