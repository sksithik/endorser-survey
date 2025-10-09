// In: @/components/QuestionCard.tsx (Example implementation)

import { QA } from '@/lib/questions'; // Assuming you export the QA type

type QuestionCardProps = {
  index: number;
  total: number;
  question: QA;
  value: string;
  onChange: (value: string) => void;
};

export default function QuestionCard({ question, value, onChange }: QuestionCardProps) {
  return (
    <div className="card">
      <h3 className="text-2xl md:text-3xl font-semibold mb-4">{question.text}</h3>
      
      {question.type === 'text' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="w-full text-lg bg-white/5 p-4 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
          placeholder="Type your answer here..."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {question.options?.map((option) => (
            <button
              key={option}
              onClick={() => onChange(option)}
              className={`p-4 rounded-lg text-left border transition-all ${
                value === option
                  ? 'bg-white text-black border-white ring-2 ring-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}