// app/api/reward/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { findTemplate, computeAward, evaluateGuardrails, naiveSentiment, naiveQualityScore, pointsToUsd } from '@/lib/rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RewardPostBody {
  action: string; // survey | review | video | share | manual | referral_topup
  channel?: string; // e.g. google, yelp, public, facebook
  proofUrls?: string[]; // links provided by endorser
  textContent?: string; // review or script text for sentiment
  manualPoints?: number; // if source manual (admin) we accept suggested amount (validated by caps)
  source?: string; // 'auto' | 'manual' | 'referral'
  referralId?: string; // for referral_topup actions
}

export async function POST(req: Request) {
  const body: RewardPostBody = await req.json().catch(() => ({} as any));
  const { action, channel, proofUrls = [], textContent = '', manualPoints, source = 'auto', referralId } = body;
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: auth } = await supabase.auth.getUser();
  const authedUserId = auth?.user?.id;
  if (!authedUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Load policy + org budget placeholders (in real app fetch from org settings)
  const policies = {
    allow_google_review_rewards: true,
    allow_yelp_review_rewards: false,
    allow_public_video_incentives: true,
  };

  // TODO: fetch org slug / org id by user; for now set static budget
  const orgBudgetRemaining = 100000; // placeholder

  const template = findTemplate(action);
  if (!template) return NextResponse.json({ error: 'Unknown action template' }, { status: 400 });

  // Guardrails: simulate recent URL + IP context
  const recentUrls: string[] = []; // Could query reward_events metadata for user
  const ipAddress = req.headers.get('x-forwarded-for') ?? '0.0.0.0';

  // Fraud & policy evaluation (budget pendingAwardPoints unknown yet; use template.basePoints or manual)
  const pendingBase = source === 'manual' && manualPoints ? manualPoints : template.basePoints;
  const guard = evaluateGuardrails({
    policy: { action, channel, policies },
    fraudCtx: { recentUrls, ipAddress, recentIpCount: 0 },
    budget: { orgPointsBudget: orgBudgetRemaining, pendingAwardPoints: pendingBase },
  });

  if (!guard.allowed) {
    return NextResponse.json({ error: 'Guardrails blocked reward', reasons: guard.reasons, fraud: guard.fraudFlags }, { status: 403 });
  }

  // Sentiment & quality
  const sentiment = naiveSentiment(textContent);
  const quality = naiveQualityScore(textContent);
  const computed = computeAward({ template, sentimentScore: sentiment, qualityScore: quality });
  let points = computed.points;
  if (source === 'manual' && manualPoints != null) {
    // Validate manual points against template cap
    if (template.maxPoints && manualPoints > template.maxPoints) {
      points = template.maxPoints;
    } else {
      points = manualPoints;
    }
  }

  const usdValue = pointsToUsd(points);

  // Update user balance atomically-ish (TODO: replace with RPC function)
  const { data: userRow, error: userErr } = await supabase
    .from('endorser_users')
    .select('id, total_points')
    .eq('id', authedUserId)
    .single();
  if (userErr || !userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const newBalance = (userRow.total_points ?? 0) + points;

  // Insert reward_event
  const rewardEventInsert = {
    user_id: authedUserId,
    action,
    source,
    points,
    usd_value: usdValue,
    metadata: {
      channel,
      proofUrls,
      sentiment,
      quality,
      referralId,
      guardrailReasons: guard.reasons,
    },
  } as any;

  const { data: rewardEventData, error: rewardEventErr } = await supabase
    .from('reward_events')
    .insert(rewardEventInsert)
    .select('id')
    .single();

  if (rewardEventErr || !rewardEventData) {
    return NextResponse.json({ error: 'Failed to create reward_event' }, { status: 500 });
  }

  // Update balance
  const { error: updErr } = await supabase
    .from('endorser_users')
    .update({ total_points: newBalance })
    .eq('id', authedUserId);
  if (updErr) return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });

  // Point transaction log
  await supabase.from('point_transactions').insert({
    user_id: authedUserId,
    delta: points,
    balance_after: newBalance,
    reward_event_id: rewardEventData.id,
    reason: `${action} awarded`,
    metadata: { channel, source },
  } as any);

  return NextResponse.json({
    message: 'Reward granted',
    points,
    usdValue,
    newBalance,
    sentiment,
    quality,
    capped: computed.capped,
  });
}
