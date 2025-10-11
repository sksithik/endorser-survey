'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { debounce } from 'lodash'
import ProgressDots from '@/components/ProgressDots'
import { QUESTION_POOL, QA } from '@/lib/questions'
import { supabase } from '@/lib/supabaseClient'
import { generateNotesFromAnswers } from '@/lib/generateNotes'
import StepGenerateFromAssets from '@/components/steps/StepGenerateFromAssets'
import StepModeAndNotes from '@/components/steps/StepModeAndNotes'
import StepQuestionnaire from '@/components/steps/StepQuestionnaire'
import StepSelfieVoice from '@/components/steps/StepSelfieVoice'
import StepTeleprompterRecord from '@/components/steps/StepTeleprompterRecord'

type Mode = 'selfie_voice' | 'teleprompter_video' | null

export default function HomePage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [qas, setQas] = useState<QA[]>(() => QUESTION_POOL.map(q => ({ ...q, answer: '' })))
  const [step, setStep] = useState(0)

  // Shared artifacts
  const [notes, setNotes] = useState<string>('')
  const [mode, setMode] = useState<Mode>(null)

  // Path A: selfie + voice
  const [selfie, setSelfie] = useState<string>('') // dataURL
  const [voiceBlobUrl, setVoiceBlobUrl] = useState<string>(''); // webm blob URL
  const [voicePublicUrl, setVoicePublicUrl] = useState<string>('')

  // Path B: teleprompter video
  const [videoBlobUrl, setVideoBlobUrl] = useState<string>('') // webm/mp4 blob URL

  // Persistence
  const [selfiePublicUrl, setSelfiePublicUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const totalSteps = qas.length + 3 // Questions -> Mode+Notes -> Path step -> Output step

  const answersObj = Object.fromEntries(qas.map(q => [q.id, q.answer]))

  // --- Persist session
  const saveProgress = useCallback(
    debounce(async (payload: any) => {
      if (!sessionId) return
      const { error } = await supabase
        .from('endorser_survey_sessions')
        .update(payload)
        .eq('session_id', sessionId)
      if (error) console.error('Error saving progress:', error)
    }, 800),
    [sessionId]
  )

  useEffect(() => {
    const init = async () => {
      if (!sessionId) { setIsLoading(false); return }
      setIsLoading(true)
      const { data, error } = await supabase
        .from('endorser_survey_sessions')
        .select('survey, current_step, selfie, selfie_public_url, notes, mode, voice_url, video_url')
        .eq('session_id', sessionId)
        .single()
      if (data) {
        if (data.survey) setQas(data.survey as QA[])
        if (typeof data.current_step === 'number') setStep(data.current_step)
        if (data.selfie) setSelfie(data.selfie)
        if (data.selfie_public_url) setSelfiePublicUrl(data.selfie_public_url)
        if (data.notes) setNotes(data.notes)
        if (data.mode) setMode(data.mode as Mode)
        if (data.voice_url) setVoicePublicUrl(data.voice_url)
        if (data.video_url) setVideoBlobUrl(data.video_url)
      } else if (error) {
        console.error('Failed to load session:', error)
      }
      setIsLoading(false)
    }
    init()
  }, [sessionId])

  useEffect(() => {
    if (isLoading) return
    saveProgress({
      survey: qas,
      current_step: step,
      notes,
      mode,
      selfie,
      selfie_public_url: selfiePublicUrl,
      voice_url: voicePublicUrl,
      video_url: videoBlobUrl
    })
  }, [qas, step, notes, mode, selfie, selfiePublicUrl, voicePublicUrl, videoBlobUrl, isLoading, saveProgress])

  // Auto-generate notes when entering Mode step and notes are empty
  useEffect(() => {
    const modeStepIndex = qas.length // after finishing questions
    if (step === modeStepIndex && !notes) {
      (async () => {
        try {
          const text = await generateNotesFromAnswers(answersObj)
          setNotes(text)
        } catch (e) {
          console.error('Generate notes failed', e)
        }
      })()
    }
  }, [step, qas.length, answersObj, notes])

  const canNext = () => {
    if (step < qas.length) return qas[step]?.answer.trim().length > 0
    if (step === qas.length) return !!mode && !!notes?.trim() // Mode+Notes step
    // Path steps:
    if (mode === 'selfie_voice') {
      // Selfie+Voice collection step
      const selfieVoiceStep = qas.length + 1
      if (step === selfieVoiceStep) return !!selfie && !!voicePublicUrl
      // Output step (always allowed to proceed—preview/download handled inside)
      return true
    }
    if (mode === 'teleprompter_video') {
      const teleStep = qas.length + 1
      if (step === teleStep) return !!videoBlobUrl // must have recorded
      return true
    }
    return true
  }

  const next = () => setStep(s => Math.min(s + 1, totalSteps - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white/80">Loading your session…</div>
  }

  return (
    <main className="min-h-screen pb-20">
      <header className="border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg sparkle" aria-hidden="true" />
            <span className="font-semibold">Scripted Selfie Video</span>
          </div>
          <ProgressDots total={totalSteps} current={step} />
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 mt-10 md:mt-14">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">
          Questions → Notes → {mode === 'teleprompter_video' ? 'Teleprompter' : 'Assets'} → Output
        </h1>
        <p className="text-white/70 mb-8">
          Choose your creation path: record a polished video with a teleprompter, or capture a selfie + voice and render a narrated video.
        </p>

        <div className="grid gap-6">
          {/* Questionnaire (multi) */}
          {step < qas.length && (
            <StepQuestionnaire
              q={qas[step]}
              index={step}
              total={qas.length}
              onChange={(v) => setQas(prev => {
                const copy = [...prev]; copy[step] = { ...copy[step], answer: v }; return copy
              })}
            />
          )}

          {/* Mode + Notes */}
          {step === qas.length && (
            <StepModeAndNotes
              notes={notes}
              setNotes={setNotes}
              mode={mode}
              setMode={setMode}
            />
          )}

          {/* Path A: Selfie + Voice (collect assets) */}
          {mode === 'selfie_voice' && step === qas.length + 1 && (
            <StepSelfieVoice
              notes={notes}
              selfie={selfie}
              setSelfie={setSelfie}
              selfiePublicUrl={selfiePublicUrl}
              setSelfiePublicUrl={setSelfiePublicUrl}
              voicePublicUrl={voicePublicUrl}
              setVoicePublicUrl={setVoicePublicUrl}
              sessionId={sessionId || undefined}
            />
          )}

          {/* Path A Output: FFmpeg slideshow + HeyGen */}
          {mode === 'selfie_voice' && step === qas.length + 2 && (
            <StepGenerateFromAssets
              notes={notes}
              selfie={selfie}
              voicePublicUrl={voicePublicUrl}
            />
          )}

          {/* Path B: Teleprompter recorder */}
          {mode === 'teleprompter_video' && step === qas.length + 1 && (
            <StepTeleprompterRecord
              notes={notes}
              videoBlobUrl={videoBlobUrl}
              setVideoBlobUrl={setVideoBlobUrl}
            />
          )}

          {/* Nav */}
          <div className="flex items-center justify-between mt-1">
            <button onClick={prev} className="btn-secondary btn" disabled={step === 0}>Back</button>
            <button onClick={next} className="btn" disabled={!canNext()}>
              {step < qas.length
                ? 'Continue'
                : step === qas.length
                  ? 'Proceed'
                  : 'Next'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
