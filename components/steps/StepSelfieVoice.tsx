'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import SelfieCapture from '@/components/SelfieCapture'
import { supabase } from '@/lib/supabaseClient'

type Props = {
  notes: string
  selfie: string
  setSelfie: (d: string) => void
  selfiePublicUrl?: string
  setSelfiePublicUrl: (u: string) => void
  voiceBlobUrl: string
  setVoiceBlobUrl: (u: string) => void
  sessionId?: string
}

/** Convert dataURL to File (for Supabase upload) */
function dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  if (!mimeMatch) throw new Error('Invalid data URL')
  const mime = mimeMatch[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8 = new Uint8Array(n)
  while (n--) u8[n] = bstr.charCodeAt(n)
  return new File([u8], filename, { type: mime })
}

type Take = {
  id: string
  url: string
  blob: Blob
  durationMs: number
  createdAt: number
}

export default function StepSelfieVoice({
  notes, selfie, setSelfie, selfiePublicUrl, setSelfiePublicUrl,
  voiceBlobUrl, setVoiceBlobUrl, sessionId
}: Props) {

  /** ====== SELFIE CAPTURE & UPLOAD ====== */
  const handleSelfieCapture = async (dataUrl: string) => {
    setSelfie(dataUrl)
    if (!sessionId) return
    try {
      const file = dataURLtoFile(dataUrl, `${sessionId}-selfie.png`)
      const filePath = `${sessionId}/${Date.now()}.png`
      const { error } = await supabase.storage.from('selfies').upload(filePath, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('selfies').getPublicUrl(filePath)
      setSelfiePublicUrl(data.publicUrl)
    } catch (e) {
      console.error('Selfie upload failed:', e)
    }
  }

  /** ====== AUDIO RECORDER WITH RE-RECORD (MULTI-TAKE) ====== */
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startTsRef = useRef<number>(0)

  // Meter
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const srcNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [durationMs, setDurationMs] = useState(0)
  const [level, setLevel] = useState(0) // 0..1
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // Takes
  const [takes, setTakes] = useState<Take[]>([])
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null)

  const selectedTake = useMemo(
    () => takes.find(t => t.id === selectedTakeId) || null,
    [takes, selectedTakeId]
  )

  // If parent already has a chosen voice (voiceBlobUrl), reflect it as a take (once)
  useEffect(() => {
    if (!voiceBlobUrl) return
    // Avoid duplicating if already present
    const exists = takes.some(t => t.url === voiceBlobUrl)
    if (!exists) {
      // We don't have the original blob/duration for external url; create a placeholder take
      setTakes(prev => [
        ...prev,
        {
          id: 'imported-' + Date.now(),
          url: voiceBlobUrl,
          blob: new Blob(), // unknown (placeholder)
          durationMs: 0,
          createdAt: Date.now()
        }
      ])
      setSelectedTakeId(prev => prev ?? 'imported-' + Date.now())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once (on mount)

  const formatDuration = (ms: number) => {
    const s = Math.round(ms / 1000)
    const mm = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = (s % 60).toString().padStart(2, '0')
    return `${mm}:${ss}`
  }

  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    try {
      analyserRef.current?.disconnect()
      srcNodeRef.current?.disconnect()
      audioCtxRef.current?.close()
    } catch {}
    analyserRef.current = null
    srcNodeRef.current = null
    audioCtxRef.current = null
  }

  const tickMeter = () => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const arr = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(arr)
    // Compute peak deviation from midpoint (128)
    let peak = 0
    for (let i = 0; i < arr.length; i++) {
      const dev = Math.abs(arr[i] - 128)
      if (dev > peak) peak = dev
    }
    setLevel(Math.min(1, peak / 128))
    rafRef.current = requestAnimationFrame(tickMeter)
  }

  const startRecording = async () => {
    setPermissionError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      chunksRef.current = []
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec

      // AudioContext for meter
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      src.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      srcNodeRef.current = src
      tickMeter()

      rec.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        stopMeter()
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const dur = Date.now() - startTsRef.current

        const take: Take = {
          id: 'take-' + Date.now(),
          url,
          blob,
          durationMs: dur,
          createdAt: Date.now()
        }
        setTakes(prev => [take, ...prev])
        setSelectedTakeId(take.id)
        setVoiceBlobUrl(url) // reflect to parent immediately

        // Cleanup stream tracks
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }

      setIsRecording(true)
      setDurationMs(0)
      startTsRef.current = Date.now()
      const timer = setInterval(() => {
        setDurationMs(Date.now() - startTsRef.current)
      }, 200)

      // store timer id on recorder for cleanup
      ;(rec as any).__timer = timer
      rec.start()
    } catch (e: any) {
      setPermissionError(e?.message || 'Microphone permission denied.')
    }
  }

  const stopRecording = () => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.stop()
      clearInterval((rec as any).__timer)
    }
    recorderRef.current = null
    setIsRecording(false)
  }

  const discardSelected = () => {
    if (!selectedTake) return
    // Revoke object URL
    URL.revokeObjectURL(selectedTake.url)
    setTakes(prev => prev.filter(t => t.id !== selectedTake.id))
    // If we were using this as parent voice, clear it
    if (voiceBlobUrl === selectedTake.url) setVoiceBlobUrl('')
    setSelectedTakeId(prev => {
      const remaining = takes.filter(t => t.id !== selectedTake.id)
      return remaining.length ? remaining[0].id : null
    })
  }

  const useSelectedForParent = () => {
    if (!selectedTake) return
    setVoiceBlobUrl(selectedTake.url)
  }

  const recordNewTake = () => {
    // If currently recording, ignore
    if (isRecording) return
    startRecording()
  }

  return (
    <div className="grid gap-6">
      {/* Notes preview (read-only hint) */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Script (for reference)</h3>
        <p className="text-sm text-white/60 mb-3">Record your voice reading this script. Keep sentences short and natural.</p>
        <div className="text-sm bg-white/5 p-4 rounded-xl border border-white/10 whitespace-pre-wrap">
          {notes || 'No notes yet.'}
        </div>
      </div>

      {/* Selfie capture */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Capture Your Selfie</h3>
        <p className="text-sm text-white/60 mb-4">Good lighting, plain background, centered framing.</p>
        <SelfieCapture onCapture={handleSelfieCapture} existingSelfie={selfie} />
        {selfie && (
          <div className="mt-3">
            <img src={selfie} alt="Selfie preview" className="rounded-lg border border-white/10 max-w-xs" />
          </div>
        )}
        {selfiePublicUrl && <p className="text-xs text-white/50 mt-2">Saved to cloud for this session.</p>}
      </div>

      {/* Audio recorder with re-record & takes */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Record Your Voice</h3>

        {permissionError && (
          <div className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {permissionError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <button className="btn" onClick={recordNewTake}>
              {takes.length ? 'Record New Take' : 'Start Recording'}
            </button>
          ) : (
            <button className="btn-secondary btn" onClick={stopRecording}>
              Stop & Save Take
            </button>
          )}

          {/* Timer */}
          <span className="text-white/80 text-sm tabular-nums">
            {isRecording ? `Recording ${formatDuration(durationMs)}` : (selectedTake ? `Selected: ${formatDuration(selectedTake.durationMs)}` : 'Idle')}
          </span>

          {/* Simple mic level bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Mic</span>
            <div className="w-28 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-[width]"
                style={{ width: `${Math.round(level * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Takes list */}
        {takes.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Takes</h4>
            <div className="grid gap-2">
              {takes.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-2 rounded-lg border ${selectedTakeId === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="take"
                      checked={selectedTakeId === t.id}
                      onChange={() => setSelectedTakeId(t.id)}
                      className="accent-blue-500"
                    />
                    <div className="text-sm">
                      <div className="font-medium">Take {new Date(t.createdAt).toLocaleTimeString()}</div>
                      <div className="text-white/60">Length: {t.durationMs ? formatDuration(t.durationMs) : '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <audio controls src={t.url} className="h-9" />
                    <button className="btn-secondary btn" onClick={() => { setSelectedTakeId(t.id); useSelectedForParent(); }}>
                      Use
                    </button>
                    <button className="btn-secondary btn" onClick={() => { setSelectedTakeId(t.id); discardSelected(); }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chosen take actions */}
        {selectedTake && (
          <div className="mt-3 flex flex-wrap gap-3">
            <a className="btn-secondary btn" href={selectedTake.url} download="voice.webm">Download Selected</a>
            <button className="btn-secondary btn" onClick={() => setVoiceBlobUrl(selectedTake.url)}>
              Set as Final Voice
            </button>
            {voiceBlobUrl && voiceBlobUrl === selectedTake.url && (
              <span className="text-xs text-emerald-300/90 self-center">✓ In use</span>
            )}
          </div>
        )}

        {/* If a final voice is already chosen but not the selected take */}
        {voiceBlobUrl && (!selectedTake || voiceBlobUrl !== selectedTake.url) && (
          <div className="mt-3 text-xs text-white/60">
            Current voice set for export. You can still record a new take and switch.
          </div>
        )}
      </div>
    </div>
  )
}
