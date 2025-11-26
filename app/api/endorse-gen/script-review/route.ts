import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function POST(req: Request) {
    try {
        const { script, context } = await req.json();
        const prompt = `
SYSTEM:
You validate the script to ensure it follows all EndorseGen compliance rules.

CHECK FOR:
- Fabricated details
- False claims
- Technical claims not in survey
- Measurements (mm, inches, U-values, R-values)
- Incentive language
- Guarantees or promises
- More than 2 friend name mentions
- Tone mismatch
- Reading level too high

If violations exist:
- Fix ONLY the violating parts.
- Do NOT rewrite the entire script unless absolutely required.

Return JSON:
{
  "script": "...corrected...",
  "repairPerformed": true/false,
  "repairNotes": ["..."],
  "warnings": []
}

INPUT:
Script: ${script}
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
        console.error('Error in script-review:', error);
        return NextResponse.json({ error: 'Failed to review script' }, { status: 500 });
    }
}
