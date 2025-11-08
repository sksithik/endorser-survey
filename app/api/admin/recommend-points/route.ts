// app/api/admin/recommend-points/route.ts
import { NextResponse } from 'next/server';
import { naiveSentiment, naiveQualityScore, findTemplate, computeAward } from '@/lib/rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RecommendBody {
  action?: string; // defaults to 'manual'
  proofText?: string; // aggregated text/evidence snippet
  notes?: string; // admin notes
}

export async function POST(req: Request) {
  const body: RecommendBody = await req.json().catch(() => ({}) as any);
  const action = body.action || 'manual';
  const proofText = body.proofText || '';

  // Sentiment & quality heuristics
  const sentiment = naiveSentiment(proofText);
  const quality = naiveQualityScore(proofText);

  // Base manual template acts as envelope for recommendation
  const template = findTemplate(action) || { action, basePoints: 0, maxPoints: 1000 } as any;
  const computed = computeAward({ template, sentimentScore: sentiment, qualityScore: quality });

  // Recommendation range strategy:
  // low end: 60% of computed.points
  // high end: 125% of computed.points (capped by template.maxPoints)
  const base = Math.max(10, computed.points || 0); // ensure non-zero suggestion
  let minRec = Math.round(base * 0.6);
  let maxRec = Math.round(base * 1.25);
  if (template.maxPoints && maxRec > template.maxPoints) maxRec = template.maxPoints;
  if (minRec > maxRec) minRec = Math.max(10, Math.round(maxRec * 0.5));

  return NextResponse.json({
    action,
    sentiment,
    quality,
    baseSuggested: base,
    recommendedRange: [minRec, maxRec],
    rationale: {
      sentimentBasis: 'Positive words increase multiplier',
      qualityBasis: 'Structure & length considered',
    },
  });
}
