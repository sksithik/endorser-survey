import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const { friendName } = await req.json();
        const prompt = `
SYSTEM:
You validate and normalize the friendName field for personal messages. 

RULES:
- Accept only first names.
- Strip honorifics (Dr, Mr, Ms).
- If more than one word, keep the first.
- Never fabricate names.
- If blank or invalid, return "useName": false.

Return JSON:
{
  "friendName": "string or null",
  "useName": true/false
}

INPUT:
${friendName}
`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in personalization:', error);
        return NextResponse.json({ error: 'Failed to validate name' }, { status: 500 });
    }
}
