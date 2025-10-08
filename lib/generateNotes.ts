export function generateNotesFromAnswers(answers: Record<string, string>) {
  const bullets = Object.entries(answers)
    .filter(([, v]) => v && v.trim().length > 0)
    .map(([k, v]) => `• ${v.trim().replace(/\s+/g, ' ')}`);
  const summary = `Here is a concise, friendly script based on your survey:\n\n` +
    bullets.join('\n') +
    `\n\nWrap-up: Thanks for listening!`;
  return summary;
}
