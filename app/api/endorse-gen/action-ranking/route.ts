import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function POST(req: Request) {
    try {
        const context: WizardContext = await req.json();
        const prompt = `
SYSTEM:
You are the "Action Ranking Engine" for the EndorseGen platform. 
Your job is to rank possible endorsement actions based on:
- The business’s industry
- The trust tier (HIGH_TRUST, GENERAL, RENO_TRADES)
- The ROI configuration provided by the business
- The endorser’s survey effort level and sentiment
- Industry-specific constraints

RULES (follow strictly):
1. If industry is a renovation/trade industry (windows, doors, roofing, HVAC, cleaning, landscaping, flooring, construction):
   - BEFORE_AFTER_IMAGES must ALWAYS be ranked #1.
   - BEFORE_AFTER_VIDEO should be included as an enhancement path.
   - PERSONAL_VIDEO_TO_FRIEND must NOT be included.

2. If trustTier = HIGH_TRUST (financial advisors, mortgage brokers, legal, accounting, coaching, consulting, private medical):
   - PERSONAL_VIDEO_TO_FRIEND must be included.
   - BEFORE_AFTER options must NOT appear unless explicitly relevant (rare).

3. If trustTier = GENERAL:
   - PERSONAL_VIDEO_TO_FRIEND must be excluded.
   - Rank based strictly on ROI configuration.

4. Never hallucinate action types not listed in the input.
5. You must output exactly 3 recommended actions max.

Return JSON only in the following format:

{
  "rankedActions": [
    "ACTION_TYPE_1",
    "ACTION_TYPE_2",
    "ACTION_TYPE_3"
  ],
  "reasons": {
    "ACTION_TYPE_1": "Why this was ranked highest.",
    "ACTION_TYPE_2": "Why second.",
    "ACTION_TYPE_3": "Why third."
  }
}

INPUT:
${JSON.stringify(context, null, 2)}
`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in action-ranking:', error);
        return NextResponse.json({ error: 'Failed to rank actions' }, { status: 500 });
    }
}
