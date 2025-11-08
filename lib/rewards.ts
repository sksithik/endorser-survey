// lib/rewards.ts
// Centralized reward & point guardrails utilities.
import type { Json, Database } from './database.types';

// Fixed exchange rate: 1000 pts = $10
export function pointsToUsd(points: number): number {
  return (points / 1000) * 10;
}

export interface PolicyFlags {
  allow_google_review_rewards?: boolean;
  allow_yelp_review_rewards?: boolean;
  allow_public_video_incentives?: boolean;
}

export interface RewardTemplate {
  action: string; // survey | review | video | share | referral_topup | manual
  basePoints: number; // nominal points suggested
  maxPoints?: number; // cap per event
  dailyCap?: number; // per user/day cap for this action
  requiresProof?: boolean;
  channels?: string[]; // e.g. ['google','facebook','yelp'] for review/share actions
}

export interface FraudContext {
  recentUrls: string[]; // last N submitted URLs by this user
  ipAddress?: string;
  recentIpCount?: number; // number of actions from same IP window
}

export interface FraudFlags {
  reusedUrl?: boolean;
  excessiveIpActivity?: boolean;
}

export function detectFraud(ctx: FraudContext): FraudFlags {
  const flags: FraudFlags = {};
  // Basic heuristic: if same URL appears >=2 times in recent history
  const urlCounts: Record<string,string[]> = {} as any;
  ctx.recentUrls.forEach(u => {
    const k = u.trim().toLowerCase();
    urlCounts[k] = urlCounts[k] || [];
    urlCounts[k].push(u);
  });
  if (Object.values(urlCounts).some(arr => arr.length > 1)) {
    flags.reusedUrl = true;
  }
  if ((ctx.recentIpCount ?? 0) > 20) { // arbitrary threshold; tune later
    flags.excessiveIpActivity = true;
  }
  return flags;
}

export interface BudgetState {
  orgPointsBudget: number; // total remaining points the org can spend
  pendingAwardPoints: number; // points requested now
}

export function hasBudget(budget: BudgetState): boolean {
  return budget.pendingAwardPoints <= budget.orgPointsBudget;
}

export interface PolicyCheckInput {
  action: string;
  channel?: string; // e.g. 'google','yelp','video'
  policies: PolicyFlags;
}

export function isChannelAllowed(input: PolicyCheckInput): boolean {
  const { action, channel, policies } = input;
  if (action === 'review') {
    if (channel === 'google') return !!policies.allow_google_review_rewards;
    if (channel === 'yelp') return !!policies.allow_yelp_review_rewards; // often false
  }
  if (action === 'video' && channel === 'public') {
    return !!policies.allow_public_video_incentives;
  }
  return true; // default allow
}

export interface AwardComputationInput {
  template: RewardTemplate;
  sentimentScore?: number; // -1..1
  qualityScore?: number; // 0..1 aggregated heuristics
}

export interface AwardComputationResult {
  points: number;
  appliedQualityMultiplier?: number;
  capped?: boolean;
}

export function computeAward(input: AwardComputationInput): AwardComputationResult {
  const { template, sentimentScore, qualityScore } = input;
  let pts = template.basePoints;
  // Apply a simple multiplier: if sentiment >0.6 and quality >0.5 add 20%
  let multiplier = 1;
  if ((sentimentScore ?? 0) > 0.6 && (qualityScore ?? 0.5) > 0.5) {
    multiplier = 1.2;
  }
  pts = Math.round(pts * multiplier);
  let capped = false;
  if (template.maxPoints && pts > template.maxPoints) {
    pts = template.maxPoints;
    capped = true;
  }
  return { points: pts, appliedQualityMultiplier: multiplier, capped };
}

// Provide templates (could be loaded per org from DB later)
export const defaultRewardTemplates: RewardTemplate[] = [
  { action: 'survey', basePoints: 50, maxPoints: 50 },
  { action: 'review', basePoints: 200, maxPoints: 400, requiresProof: true, channels: ['google','facebook','yelp'] },
  { action: 'video', basePoints: 400, maxPoints: 800, requiresProof: true, channels: ['public'] },
  { action: 'share', basePoints: 150, maxPoints: 300, requiresProof: true, channels: ['facebook','linkedin','twitter'] },
  { action: 'referral_topup', basePoints: 0, maxPoints: 10000 },
  { action: 'manual', basePoints: 0, maxPoints: 10000 },
];

export function findTemplate(action: string): RewardTemplate | undefined {
  return defaultRewardTemplates.find(t => t.action === action);
}

export interface GuardrailDecision {
  allowed: boolean;
  reasons: string[];
  fraudFlags?: FraudFlags;
}

export function evaluateGuardrails(params: {
  policy: PolicyCheckInput;
  fraudCtx: FraudContext;
  budget: BudgetState;
}): GuardrailDecision {
  const reasons: string[] = [];
  const channelOk = isChannelAllowed(params.policy);
  if (!channelOk) reasons.push('Channel not allowed by policy');
  const fraudFlags = detectFraud(params.fraudCtx);
  if (fraudFlags.reusedUrl) reasons.push('URL reused');
  if (fraudFlags.excessiveIpActivity) reasons.push('Excessive actions from same IP');
  const budgetOk = hasBudget(params.budget);
  if (!budgetOk) reasons.push('Insufficient org budget');
  return { allowed: channelOk && budgetOk && reasons.length === 0, reasons, fraudFlags };
}

// Simple sentiment stub until AI integration: counts positive words.
const POSITIVE_WORDS = ['great','good','amazing','excellent','helpful','love','fantastic'];
export function naiveSentiment(text: string): number {
  if (!text) return 0;
  const tokens = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const positives = tokens.filter(t => POSITIVE_WORDS.includes(t)).length;
  return Math.min(1, positives / Math.max(3, tokens.length)); // crude normalization
}

// Quality score stub: length & presence of key sections
export function naiveQualityScore(text: string): number {
  if (!text) return 0;
  const len = text.length;
  const hasOutcome = /outcome|result|benefit/i.test(text) ? 1 : 0;
  const hasProblem = /problem|struggle|issue/i.test(text) ? 1 : 0;
  const hasSolution = /solution|helped|resolved/i.test(text) ? 1 : 0;
  const structural = hasOutcome + hasProblem + hasSolution; // 0..3
  const lengthScore = Math.min(1, len / 500); // reward decent length up to 500 chars
  return (structural / 3) * 0.6 + lengthScore * 0.4;
}
