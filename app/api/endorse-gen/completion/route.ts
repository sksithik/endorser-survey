import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function POST(req: Request) {
    try {
        const context: WizardContext = await req.json();
        const prompt = `
SYSTEM:
Generate a simple, warm completion message thanking the user.
Emphasize:
- Appreciation
- Their effort
- That their story may help others

Must NOT:
- Mention reviews
- Mention incentives tied to sharing or positivity
- Ask them to promote aggressively

Return JSON:
{
  "completionMessage": "..."
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
        console.error('Error in completion:', error);
        return NextResponse.json({ error: 'Failed to generate completion message' }, { status: 500 });
    }
}
