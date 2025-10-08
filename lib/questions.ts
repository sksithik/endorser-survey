export type Question = { id: string; text: string; placeholder?: string };

export const QUESTION_POOL: Question[] = [
  { id: 'goal', text: 'What is your #1 goal right now?', placeholder: 'E.g., get in shape, launch a product...' },
  { id: 'challenge', text: 'What is the biggest challenge holding you back?', placeholder: 'Time, clarity, resources...' },
  { id: 'timeline', text: 'What is your timeline?', placeholder: 'E.g., 30 days, 3 months...' },
  { id: 'audience', text: 'Who is this mainly for (audience)?', placeholder: 'Myself, my team, my customers...' },
  { id: 'tone', text: 'What tone do you want the message to have?', placeholder: 'Friendly, professional, bold...' },
  { id: 'win', text: 'What would success look like?', placeholder: 'Describe a great outcome in one sentence.' },
  { id: 'cta', text: 'What action do you want people to take?', placeholder: 'Sign up, reply, book a call...' },
  { id: 'inspire', text: 'Share a short inspiring thought you like.', placeholder: 'A quote or mantra (optional).' },
  { id: 'intro', text: 'How would you introduce yourself in one line?', placeholder: 'Your name + role.' },
  { id: 'context', text: 'Any context we should keep in mind?', placeholder: 'Constraints, preferences, background...' },
];

export function pickRandomQuestions(n: number): Question[] {
  const pool = [...QUESTION_POOL];
  const picked: Question[] = [];
  while (picked.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}
