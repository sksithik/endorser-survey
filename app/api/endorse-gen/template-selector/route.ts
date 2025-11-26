import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function POST(req: Request) {
    try {
        const context: WizardContext = await req.json();
        const prompt = `
SYSTEM:
You choose the most relevant example template format for the wizard. 
Do NOT create testimonial content. Only choose format style.

RULES:
- If chosenActionType = BEFORE_AFTER_IMAGES → pick a transformation narrative template.
- If chosenActionType = BEFORE_AFTER_VIDEO → pick the “guided walkthrough” template.
- If chosenActionType = NETWORK_VIDEO → pick a short, confident “this helped me, might help you” structure.
- If chosenActionType = STATIC_TESTIMONIAL_IMAGE → pick the quote-card format.
- If chosenActionType = PERSONAL_VIDEO_TO_FRIEND → pick the warm, personal conversational template.

Return JSON:
{
  "chosenExampleTemplateId": "template_x",
  "why": "Short explanation"
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
        console.error('Error in template-selector:', error);
        return NextResponse.json({ error: 'Failed to select template' }, { status: 500 });
    }
}
