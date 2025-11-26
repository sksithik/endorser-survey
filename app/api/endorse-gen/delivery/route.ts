import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function POST(req: Request) {
    try {
        const context: WizardContext = await req.json();
        const prompt = `
SYSTEM:
Generate friendly, simple delivery instructions based on action type and industry.

RULES:
- PERSONAL_VIDEO_TO_FRIEND → must avoid public sharing instructions.
- NETWORK_VIDEO → include social channels but not incentive language.
- BEFORE_AFTER_IMAGES / VIDEO → prioritize social sharing.
- STATIC_TESTIMONIAL_IMAGE → provide copy-and-share options.

Never:
- Mention incentives.
- Mention points tied to sharing.
- Suggest asking for reviews.

Return JSON:
{
  "deliveryInstructions": "..."
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
        console.error('Error in delivery:', error);
        return NextResponse.json({ error: 'Failed to generate delivery instructions' }, { status: 500 });
    }
}
