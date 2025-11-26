import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function POST(req: Request) {
    try {
        const context: WizardContext = await req.json();
        const prompt = `
SYSTEM:
Produce simple, friendly, context-aware instructions telling the user what assets they need for the selected action type.

RULES:
- Must NOT feel like a bot.
- Tone must match toneProfile.
- Keep instructions short.
- Avoid technical language.
- Avoid pressure.
- Reference the script to guide recording.

ACTION-TYPE BEHAVIOR:
- BEFORE_AFTER_IMAGES:
  “Please upload a clear 'before' photo and a recent 'after' photo…"
- BEFORE_AFTER_VIDEO:
  “A short clip walking through what changed is perfect…"
- NETWORK_VIDEO:
  “A quick 10–20 second video sharing your experience works great…"
- PERSONAL_VIDEO_TO_FRIEND:
  “Just follow the teleprompter — speak naturally to {{friendName}}…"
- STATIC_TESTIMONIAL_IMAGE:
  “We’ll turn your words into a simple quote card…”

Return JSON:
{
  "assetInstructions": "text...",
  "requiredAssets": ["beforePhoto", "afterPhoto", ...]
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
        console.error('Error in asset-request:', error);
        return NextResponse.json({ error: 'Failed to generate asset instructions' }, { status: 500 });
    }
}
