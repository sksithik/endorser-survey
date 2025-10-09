export type Question = {
  id: string;
  text: string;
  type: 'text' | 'multiple-choice';
  options?: string[]; // Options are only needed for multiple-choice questions
};

// Define the corresponding Answer type
export type QA = Question & { answer: string };

export const QUESTION_POOL: Question[] = [
  {
    id: 'overall_rating',
    type: 'multiple-choice',
    text: 'Overall, how would you rate our service today?',
    options: ['Excellent', 'Good', 'Average', 'Could Be Better', 'Poor'],
  },
  {
    id: 'standout_feature',
    type: 'multiple-choice',
    text: 'What stood out the most to you in a positive way?',
    options: [
      'The Quality of the Product',
      'The Speed of Service',
      'The Customer Support',
      'The Price/Value',
    ],
  },
  {
    id: 'improvement_feedback',
    type: 'text',
    text: 'What is one thing we could do to make your experience even better next time?',
  },
  {
    id: 'user_name',
    type: 'text',
    text: 'Finally, what name should we use in your personalized thank you video?',
  },
];