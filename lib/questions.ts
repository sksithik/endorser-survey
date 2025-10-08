export type Question = { id: string; text: string; placeholder?: string };

export const QUESTION_POOL: Question[] = [
  { id: 'goal', text: 'What is your #1 goal right now?', placeholder: 'E.g., get in shape, launch a product...' },
  { id: 'challenge', text: 'What is the biggest challenge holding you back?', placeholder: 'Time, clarity, resources...' },
  { id: 'timeline', text: 'What is your timeline?', placeholder: 'E.g., 30 days, 3 months...' },
  { id: 'audience', text: 'Who is this mainly for (audience)?', placeholder: 'Myself, my team, my customers...' },
  { id: 'tone', text: 'What tone do you want the message to have?', placeholder: 'Friendly, professional, bold...' },
];