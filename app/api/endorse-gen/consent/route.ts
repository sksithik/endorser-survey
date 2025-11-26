import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST() {
    try {
        const prompt = `
SYSTEM:
You generate a clear, plain-language consent notice explaining that:
- A photo will be used to create a talking avatar
- User’s voice may be synthesized
- Content is ONLY used to create the endorsement video
- No biometric data is stored after rendering

The notice must be:
- One short paragraph
- Grade 5–6 reading level
- No legal jargon
- No pressure

Return JSON:
{
  "consentNotice": "..."
}
`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in consent:', error);
        return NextResponse.json({ error: 'Failed to generate consent notice' }, { status: 500 });
    }
}
