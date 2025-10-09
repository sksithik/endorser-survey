'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProgressDots from '@/components/ProgressDots'
import QuestionCard from '@/components/QuestionCard'
import SelfieCapture from '@/components/SelfieCapture'
import VideoGenerator from '@/components/VideoGenerator'
import VendorAIGenerator from '@/components/VendorAIGenerator'
import { generateNotesFromAnswers } from '@/lib/generateNotes'
import { QUESTION_POOL } from '@/lib/questions'

type QA = { id: string; text: string; answer: string }

export default function HomePage(){
  const [qas, setQas] = useState<QA[]>(QUESTION_POOL.map(q=>({ ...q, answer: '' })))
  const [step, setStep] = useState(0) // 0..(qLen-1) = questions, qLen = selfie, qLen+1 = notes/video
  const [selfie, setSelfie] = useState<string>('')
  const totalSteps = qas.length + 2
  const [notes, setNotes] = useState<string>('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)

  const canNext = ()=>{
    if(step < qas.length) return qas[step].answer.trim().length > 0
    if(step === qas.length) return !!selfie
    return true
  }

  const next = ()=> setStep(s => Math.min(s+1, totalSteps-1))
  const prev = ()=> setStep(s => Math.max(s-1, 0))

  const answersObj = Object.fromEntries(qas.map(q=>[q.id, q.answer]))

  // Generate notes via API when entering final step or answers change while on final step
  useEffect(() => {
    const onFinal = step === qas.length + 1
    if (!onFinal) return
    let canceled = false
    setNotesLoading(true)
    setNotesError(null)
    generateNotesFromAnswers(answersObj)
      .then(text => { if (!canceled) setNotes(text) })
      .catch(err => { if (!canceled) setNotesError(err?.message || 'Failed to generate notes') })
      .finally(() => { if (!canceled) setNotesLoading(false) })
    return () => { canceled = true }
  }, [step, qas.length, JSON.stringify(answersObj)])

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-10 backdrop-blur bg-black/20 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg sparkle" />
            <span className="font-semibold">AI Talking Wizard</span>
          </div>
          <ProgressDots total={totalSteps} current={step} />
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 mt-10 md:mt-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">
            Survey ➜ Selfie ➜ Auto‑Notes ➜ Talking Video
          </h1>
        </motion.div>
        <p className="text-white/70 mb-8">Beautiful, animated, mobile‑first experience. Your data stays in your browser unless you opt into a vendor.</p>

        <div className="grid gap-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {step < qas.length && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <QuestionCard
                  index={step}
                  total={qas.length}
                  question={qas[step]}
                  value={qas[step].answer}
                  onChange={(v)=>{
                    setQas(qs => {
                      const copy = [...qs]; copy[step] = { ...copy[step], answer: v }; return copy
                    })
                  }}
                />
              </motion.div>
            )}

            {step === qas.length && (
              <motion.div
                key="selfie"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <SelfieCapture onCapture={setSelfie} />
              </motion.div>
            )}

            {step === qas.length + 1 && (
              <motion.div
                key="final"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <div className="grid gap-6">
                  <div className="card">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-3">Your Auto‑Generated Notes (Script)</h3>
                    {notesLoading && (
                      <div className="text-sm text-white/70">Generating notes with AI…</div>
                    )}
                    {notesError && (
                      <div className="text-sm text-red-400">{notesError}</div>
                    )}
                    {!notesLoading && !notesError && (
                      <textarea
                        value={notes}
                        onChange={(e)=>setNotes(e.target.value)}
                        rows={10}
                        className="w-full text-sm bg-white/5 p-4 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
                        placeholder="Your script will appear here. You can edit it before generating the video."
                      />
                    )}
                  </div>
                  <VideoGenerator selfieDataUrl={selfie} scriptText={notes} />
                  <VendorAIGenerator selfieDataUrl={selfie} scriptText={notes} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-1">
            <button onClick={prev} className="btn-secondary btn" disabled={step===0}>Back</button>
            <button onClick={next} className="btn" disabled={!canNext()}>
              {step < qas.length ? 'Next' : (step === qas.length ? 'Finish' : 'Done')}
            </button>
          </div>
        </div>

        <footer className="mt-10 text-center text-white/50 text-xs">
          Tip: In the final step, hit “Start Recording”, read the prompter, then “Download Video”.
        </footer>
      </section>
    </main>
  )
}
