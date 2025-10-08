'use client'
import { motion } from 'framer-motion'

export default function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className={`step-dot ${i <= current ? 'active' : ''}`}
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: i === current ? 1.15 : 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      ))}
    </div>
  )
}
