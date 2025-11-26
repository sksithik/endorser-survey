import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function POST(req: Request) {
    try {
        const { surveyFreeText, context } = await req.json();
        const prompt = `
SYSTEM:
Generate a review-helper card using ONLY the endorser’s own surveyFreeText.
Do NOT edit sentiment.
Do NOT add claims.
Do NOT encourage positivity.
Do NOT mention points or rewards.

Keep the message:
- Natural
- Neutral
- Optional

Clarify:
“This is based only on what you shared earlier.”

Return JSON:
{
  "reviewText": "...",
  "notes": ["No incentives used.", "User provided all wording."]
}

INPUT:
Survey Text: ${surveyFreeText}
Context: ${JSON.stringify(context, null, 2)}
`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in review-assist:', error);
        return NextResponse.json({ error: 'Failed to generate review assist' }, { status: 500 });
    }
}
