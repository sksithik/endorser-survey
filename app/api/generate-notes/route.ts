import { NextResponse } from 'next/server'

// If you prefer Edge runtime, uncomment the next line
// export const runtime = 'edge'

type Answers = Record<string, string>

export async function POST(req: Request) {
	try {
		const { answers } = (await req.json()) as { answers?: Answers }
		if (!answers || typeof answers !== 'object') {
			return NextResponse.json({ error: 'Missing or invalid "answers"' }, { status: 400 })
		}

		const OPENAI_API_KEY = process.env.OPENAI_API_KEY
		if (!OPENAI_API_KEY) {
			return NextResponse.json({ error: 'Server missing OPENAI_API_KEY' }, { status: 500 })
		}

		const nonEmpty = Object.entries(answers)
			.filter(([, v]) => v && v.trim().length > 0)
			.map(([, v]) => v.trim().replace(/\s+/g, ' '))

		const bullets = nonEmpty.map((v, i) => `${i + 1}. ${v}`).join('\n')

		const system = `You are a helpful assistant that turns short survey answers into a friendly, concise speaking script for a 30-45 second selfie video. Keep it warm, natural, and first-person.`
		const user = `Create a short script from these points (keep it around 120-180 words) and format as clear short paragraphs, not bullets. End with a warm brief wrap-up.\n\nPoints:\n${bullets}`

		// Call OpenAI via REST to avoid extra deps
		const resp = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user },
				],
				temperature: 0.7,
				max_tokens: 400,
			}),
		})

		if (!resp.ok) {
			const errText = await resp.text().catch(() => '')
			return NextResponse.json({ error: 'OpenAI request failed', details: errText }, { status: 502 })
		}

		const data = (await resp.json()) as any
		const content: string | undefined = data?.choices?.[0]?.message?.content

		if (!content) {
			return NextResponse.json({ error: 'No content returned from OpenAI' }, { status: 502 })
		}

		return NextResponse.json({ notes: content })
	} catch (e: any) {
		return NextResponse.json({ error: 'Failed to generate notes', details: e?.message ?? String(e) }, { status: 500 })
	}
}

