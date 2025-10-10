'use client'
import QuestionCard from '@/components/QuestionCard'
import { QA } from '@/lib/questions'

type Props = {
  q: QA
  index: number
  total: number
  onChange: (val: string) => void
}

export default function StepQuestionnaire({ q, index, total, onChange }: Props) {
  return (
    <div className="card">
      <h3 className="text-xl font-semibold mb-3">Step 1: Questionnaire</h3>
      <p className="text-sm text-white/60 mb-4">
        Brief answers are fine—keep your natural tone. We’ll synthesize a concise script from your responses.
      </p>
      <QuestionCard
        index={index}
        total={total}
        question={q}
        value={q.answer}
        onChange={onChange}
      />
    </div>
  )
}
