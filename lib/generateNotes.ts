export async function generateNotesFromAnswers(answers: Record<string, string>): Promise<string> {
  try {
    const resp = await fetch('/api/generate-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err?.error || `Request failed: ${resp.status}`)
    }
    const data = (await resp.json()) as { notes?: string }
    return data.notes || 'No notes generated.'
  } catch (e: any) {
    console.error('generateNotesFromAnswers error:', e)
    return 'Sorry, failed to generate notes. Please try again.'
  }
}
