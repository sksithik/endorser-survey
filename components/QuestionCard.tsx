'use client'
import { motion } from 'framer-motion'

export default function QuestionCard({ index, total, question, value, onChange }:{
  index: number; total: number; question: { id: string; text: string; placeholder?: string };
  value: string; onChange: (v: string)=>void;
}){
  return (
    <motion.div
      className="card"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
    >
      <div className="text-white/60 text-xs mb-2">Question {index+1} of {total}</div>
      <h3 className="text-2xl md:text-3xl font-semibold mb-4">{question.text}</h3>
      <textarea
        className="input min-h-[140px]"
        placeholder={question.placeholder || 'Type your answer...'}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
      />
    </motion.div>
  )
}
