import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function POST(req: Request) {
    try {
        const context: WizardContext = await req.json();
        const prompt = `
SYSTEM:
You generate a natural, honest script for an endorsement message.
This script must match the chosen action type and industry.

ABSOLUTE RULES:
1. Use ONLY the user’s surveyFreeText. Do NOT invent details.
2. Do NOT exaggerate. Do NOT claim results that were not stated.
3. Do NOT fabricate project details or measurements.
4. Never mention rewards, incentives, or anything tied to sentiment.
5. Never ask for reviews, ratings, or testimonials.
6. Keep reading level Grade 5–7.
7. Keep it warm, natural, conversational.
8. All content must reflect the business's toneProfile.

ACTION-TYPE LOGIC:
- BEFORE_AFTER_IMAGES:
  * Structure as a transformation story:
    "Before we had X… After they came, now it's Y."
  * If survey does NOT include explicit before/after details, use neutral framing:
    "They helped with our project, and the results made a real difference."
  * Keep it visual, simple, and descriptive without exaggeration.

- BEFORE_AFTER_VIDEO:
  * Include gentle “walkthrough” phrasing:
    "Here's a quick look at what changed…"
  * Keep it under 20–30 seconds spoken speed.

- NETWORK_VIDEO:
  * Short, high-energy, forward-facing message.
  * No call-to-sale — only “This helped me…” style.

- PERSONAL_VIDEO_TO_FRIEND:
  * Use friendName only if useName=true.
  * Max 2 mentions.
  * Warm tone: “I thought of you because…”

- STATIC_TESTIMONIAL_IMAGE:
  * 1–2 sentence concise statement.
  * No exaggerated claims.

STRUCTURE REQUIREMENTS:
- 1 sentence opening
- 1–3 core points pulled ONLY from the surveyFreeText
- Clear, natural closing line
- Total word count should match action type (shorter for image/static)

Return JSON:
{
  "script": "...",
  "estimatedReadingSeconds": number,
  "engagementBoostersIncluded": [
     "clear opening",
     "natural pacing",
     "confidence line",
     "soft CTA (non salesy)"
  ],
  "warnings": []
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
        console.error('Error in script-generator:', error);
        return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 });
    }
}
