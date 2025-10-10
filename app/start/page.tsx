'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { debounce } from 'lodash'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

import ProgressDots from '@/components/ProgressDots'
import QuestionCard from '@/components/QuestionCard'
import SelfieCapture from '@/components/SelfieCapture'

import { generateNotesFromAnswers } from '@/lib/generateNotes'
import { QUESTION_POOL, QA } from '@/lib/questions'
import { supabase } from '@/lib/supabaseClient'
import VendorAIGenerator from '@/components/VendorAIGenerator'

// Helper to convert data URL to a file object for uploading
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  if (!mimeMatch) throw new Error('Invalid data URL')
  const mime = mimeMatch[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new File([u8arr], filename, { type: mime })
}

export default function HomePage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  // State
  const [qas, setQas] = useState<QA[]>(() => QUESTION_POOL.map(q => ({ ...q, answer: '' })))
  const [step, setStep] = useState(0)
  const [selfie, setSelfie] = useState<string>('')
  const [selfiePublicUrl, setSelfiePublicUrl] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Notes (script) generation
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)

  // TTS
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // FFmpeg video generation
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationMessage, setGenerationMessage] = useState('')
  const ffmpegRef = useRef(new FFmpeg())

  const totalSteps = qas.length + 2 // 1) Questions, 2) Selfie, 3) Review & Generate
  const answersObj = Object.fromEntries(qas.map(q => [q.id, q.answer]))

  // --- DATA PERSISTENCE ---
  const saveProgress = useCallback(
    debounce(async (dataToSave: any) => {
      if (!sessionId) return
      const { error } = await supabase
        .from('endorser_survey_sessions')
        .update(dataToSave)
        .eq('session_id', sessionId)
      if (error) console.error('Error saving progress:', error)
    }, 1000),
    [sessionId]
  )

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!sessionId) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      const { data, error } = await supabase
        .from('endorser_survey_sessions')
        .select('survey, current_step, selfie, selfie_public_url, notes')
        .eq('session_id', sessionId)
        .single()

      if (data) {
        if (data.survey) setQas(data.survey as QA[])
        if (typeof data.current_step === 'number') setStep(data.current_step)
        if (data.selfie) setSelfie(data.selfie)
        if (data.selfie_public_url) setSelfiePublicUrl(data.selfie_public_url)
        if (data.notes) setNotes(data.notes)
      } else if (error) {
        console.error('Failed to load session:', error)
      }
      setIsLoading(false)
    }
    fetchInitialData()
  }, [sessionId])

  useEffect(() => {
    if (isLoading) return
    saveProgress({
      survey: qas,
      current_step: step,
      selfie: selfie,
      selfie_public_url: selfiePublicUrl,
      notes: notes
    })
  }, [qas, step, selfie, selfiePublicUrl, notes, isLoading, saveProgress])

  // --- VOICES / TTS ---
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      if (availableVoices.length > 0) {
        setVoices(availableVoices)
        const defaultVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith('en')) || availableVoices[0]
        setSelectedVoice(defaultVoice ?? null)
      }
    }
    window.speechSynthesis.onvoiceschanged = loadVoices
    loadVoices()
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const handleSelfieCapture = async (dataUrl: string) => {
    setSelfie(dataUrl)
    if (!sessionId) return
    try {
      const file = dataURLtoFile(dataUrl, `${sessionId}-selfie.png`)
      const filePath = `${sessionId}/${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('selfies').upload(filePath, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('selfies').getPublicUrl(filePath)
      setSelfiePublicUrl(data.publicUrl)
    } catch (e) {
      console.error('Selfie upload failed:', e)
    }
  }

  // Generate notes (script) automatically upon entering final step
  useEffect(() => {
    const onFinal = step === qas.length + 1
    if (!onFinal || notes) return
    let canceled = false
    setNotesLoading(true)
    setNotesError(null)
    generateNotesFromAnswers(answersObj)
      .then(text => {
        if (!canceled) setNotes(text)
      })
      .catch(err => {
        if (!canceled) setNotesError(err?.message || 'Could not generate your script.')
      })
      .finally(() => {
        if (!canceled) setNotesLoading(false)
      })
    return () => {
      canceled = true
    }
  }, [step, qas.length, answersObj, notes])

  const toggleAudio = useCallback(() => {
    const synth = window.speechSynthesis
    if (isSpeaking) {
      synth.cancel()
      setIsSpeaking(false)
    } else {
      const utterance = new SpeechSynthesisUtterance(notes || '')
      if (selectedVoice) utterance.voice = selectedVoice
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      synth.speak(utterance)
    }
  }, [isSpeaking, notes, selectedVoice])

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current
    ffmpeg.on('progress', ({ progress }) => setGenerationProgress(Math.round(progress * 100)))
    setGenerationMessage('Preparing video engine…')
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    })
  }

  const generateVideo = async () => {
    if (!selfie || !notes || !selectedVoice) return
    setIsGenerating(true)
    setVideoUrl('')
    setGenerationProgress(0)

    const ffmpeg = ffmpegRef.current
    if (!(ffmpeg as any).loaded) await loadFFmpeg()

    // Capture synthetic speech to an audio blob
    setGenerationMessage('Generating narration…')
    const audioBlob = await new Promise<Blob>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(notes)
      utterance.voice = selectedVoice!
      const audioContext = new AudioContext()
      const dest = audioContext.createMediaStreamDestination()
      const mediaRecorder = new MediaRecorder(dest.stream)
      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }))
      // NOTE: Some browsers do not allow direct capture of speechSynthesis to MediaStreamDestination.
      // This is a best-effort local capture; consider server-side TTS if reliability is required.
      const source = audioContext.createMediaStreamSource(dest.stream)
      source.connect(audioContext.destination)
      utterance.onend = () => setTimeout(() => { mediaRecorder.stop(); audioContext.close() }, 300)
      mediaRecorder.start()
      window.speechSynthesis.speak(utterance)
    })

    setGenerationMessage('Composing video…')
    await ffmpeg.writeFile('selfie.png', await fetchFile(selfie))
    await ffmpeg.writeFile('audio.webm', await fetchFile(audioBlob))

    await ffmpeg.exec([
      '-loop', '1',
      '-i', 'selfie.png',
      '-i', 'audio.webm',
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      'output.mp4'
    ])

    setGenerationMessage('Finalizing…')
    const data = await ffmpeg.readFile('output.mp4')
    const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }))
    setVideoUrl(url)
    setIsGenerating(false)
    setGenerationMessage('')
  }

  const canNext = () =>
    step < qas.length
      ? qas[step]?.answer.trim().length > 0
      : (step === qas.length ? !!selfie : true)

  const next = () => setStep(s => Math.min(s + 1, totalSteps - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80">
        Loading your session…
      </div>
    )
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
          Questions → Selfie → Script → MP4
        </h1>
        <p className="text-white/70 mb-8">
          Answer a few prompts, take a selfie, auto-generate a short script, then export a narrated MP4 locally—no server upload required.
        </p>

        <div className="grid gap-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {step < qas.length && qas[step] && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
              >
                <div className="card">
                  <h3 className="text-xl font-semibold mb-3">Step 1: Questionnaire</h3>
                  <p className="text-sm text-white/60 mb-4">
                    Brief answers are fine—keep your natural tone. We’ll synthesize a concise script from your responses.
                  </p>
                  <QuestionCard
                    index={step}
                    total={qas.length}
                    question={qas[step]}
                    value={qas[step].answer}
                    onChange={(v) => {
                      setQas(qs => {
                        const c = [...qs]
                        c[step] = { ...c[step], answer: v }
                        return c
                      })
                    }}
                  />
                </div>
              </motion.div>
            )}

            {step === qas.length && (
              <motion.div
                key="selfie"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
              >
                <div className="card">
                  <h3 className="text-xl font-semibold mb-3">Step 2: Capture Your Selfie</h3>
                  <p className="text-sm text-white/60 mb-4">
                    Good lighting, plain background, and centered framing work best.
                  </p>
                  <SelfieCapture onCapture={handleSelfieCapture} existingSelfie={selfie} />
                  {selfiePublicUrl && (
                    <p className="text-xs text-white/50 mt-3">
                      Saved to cloud storage for this session.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {step === qas.length + 1 && (
              <motion.div
                key="final"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
              >
                <div className="grid gap-6">
                  {/* ✅ Selfie Preview Card */}
                  {selfie && (
                    <div className="card flex flex-col items-center text-center">
                      <h3 className="text-xl font-semibold mb-3">Your Selfie Preview</h3>
                      <p className="text-sm text-white/60 mb-4">
                        This is the image that will be used for your AI video and slideshow.
                      </p>
                      <div className="w-full flex justify-center">
                        <img
                          src={selfie}
                          alt="Captured selfie preview"
                          className="rounded-xl border border-white/10 max-w-xs w-full object-cover shadow-md"
                        />
                      </div>
                    </div>
                  )}

                  {/* Script Review */}
                  <div className="card">
                    <h3 className="text-xl font-semibold mb-3">Step 3: Review Your Script</h3>
                    {notesLoading && <div className="text-sm text-white/70">Creating your script…</div>}
                    {notesError && <div className="text-sm text-red-400">{notesError}</div>}

                    {!notesLoading && !notesError && (
                      <>
                        <textarea
                          aria-label="Script editor"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={8}
                          className="w-full text-sm bg-white/5 p-4 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Edit your script here before generating audio…"
                        />
                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                          <label className="text-sm text-white/70 w-full sm:w-auto" htmlFor="voice-picker">
                            Voice
                          </label>
                          <select
                            id="voice-picker"
                            value={selectedVoice?.name || ''}
                            onChange={(e) =>
                              setSelectedVoice(voices.find(v => v.name === e.target.value) || null)
                            }
                            className="custom-select w-full flex-grow bg-white/5 p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={voices.length === 0 || isSpeaking || isGenerating}
                          >
                            {voices.length > 0 ? (
                              voices.map(v => (
                                <option key={v.name} value={v.name}>
                                  {v.name} ({v.lang})
                                </option>
                              ))
                            ) : (
                              <option>Loading voices…</option>
                            )}
                          </select>
                          <button
                            onClick={toggleAudio}
                            className="btn w-full sm:w-auto"
                            disabled={!notes || voices.length === 0 || isGenerating}
                          >
                            {isSpeaking ? 'Stop Preview' : 'Preview Voice'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* FFmpeg Section */}
                  <div className="card bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                    <h3 className="text-xl font-semibold mb-3">Export: Selfie + Narration → MP4</h3>
                    <p className="text-sm text-white/60 mb-4">
                      Runs entirely in your browser — no uploads required. Keep this tab open while it renders.
                    </p>

                    {!isGenerating && !videoUrl && (
                      <button
                        onClick={generateVideo}
                        className="btn w-full"
                        disabled={!selfie || !notes}
                      >
                        Generate MP4
                      </button>
                    )}

                    {isGenerating && (
                      <div className="text-center">
                        <div className="font-semibold mb-2">{generationMessage}</div>
                        <div className="w-full bg-white/10 rounded-full h-2.5">
                          <div
                            className="bg-blue-500 h-2.5 rounded-full transition-[width]"
                            style={{ width: `${generationProgress}%` }}
                          ></div>
                        </div>
                        <div className="text-sm mt-2 text-white/70">Rendering…</div>
                      </div>
                    )}

                    {videoUrl && (
                      <div className="grid gap-4">
                        <video src={videoUrl} controls className="w-full rounded-lg" />
                        <a
                          href={videoUrl}
                          download="scripted_selfie.mp4"
                          className="btn-secondary btn w-full text-center"
                        >
                          Download MP4
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ✅ Vendor Generator (HeyGen only) */}
                  <VendorAIGenerator selfieDataUrl={selfie} scriptText={notes} />
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          <div className="flex items-center justify-between mt-1">
            <button onClick={prev} className="btn-secondary btn" disabled={step === 0}>
              Back
            </button>
            <button
              onClick={next}
              className="btn"
              disabled={!canNext()}
              aria-disabled={!canNext()}
            >
              {step < qas.length ? 'Continue' : step === qas.length ? 'Proceed to Review' : 'Done'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
