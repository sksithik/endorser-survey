'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import SelfieCapture from '@/components/SelfieCapture'
import { supabase } from '@/lib/supabaseClient' // Ensure this path is correct

type Props = {
  notes: string
  selfie: string
  setSelfie: (d: string) => void
  selfiePublicUrl?: string
  setSelfiePublicUrl: (u: string) => void
  voicePublicUrl: string // Changed from voiceBlobUrl
  setVoicePublicUrl: (u: string) => void // Changed from setVoiceBlobUrl
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
  localUrl: string // For immediate playback
  publicUrl?: string // For the parent component
  blob: Blob
  durationMs: number
  createdAt: number
  isUploading: boolean // To show loading state
}

export default function StepSelfieVoice({
  notes, selfie, setSelfie, selfiePublicUrl, setSelfiePublicUrl,
  voicePublicUrl, setVoicePublicUrl, sessionId
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

  useEffect(() => {
    if (voicePublicUrl && !takes.some(t => t.publicUrl === voicePublicUrl)) {
      const importedTake: Take = {
        id: 'imported-' + Date.now(),
        localUrl: voicePublicUrl, // Use public URL for local playback too
        publicUrl: voicePublicUrl,
        blob: new Blob(),
        durationMs: 0,
        createdAt: Date.now(),
        isUploading: false,
      }
      setTakes(prev => [importedTake, ...prev])
      setSelectedTakeId(importedTake.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatDuration = (ms: number) => {
    const s = Math.round(ms / 1000)
    const mm = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = (s % 60).toString().padStart(2, '0')
    return `${mm}:${ss}`
  }

  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    analyserRef.current?.disconnect()
    srcNodeRef.current?.disconnect()
    audioCtxRef.current?.close().catch(() => {})
    analyserRef.current = null
    srcNodeRef.current = null
    audioCtxRef.current = null
  }
  
  const tickMeter = () => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const arr = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(arr)
    let peak = 0
    for (const dev of arr) peak = Math.max(peak, Math.abs(dev - 128))
    setLevel(Math.min(1, peak / 128))
    rafRef.current = requestAnimationFrame(tickMeter)
  }

  const startRecording = async () => {
    setPermissionError(null)
    if (!sessionId) {
        alert("Session ID is missing. Cannot save recordings.")
        return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      chunksRef.current = []
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec

      // Meter setup...
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
      
      // === THIS IS THE CORE LOGIC CHANGE ===
      rec.onstop = () => {
        stopMeter()
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const localUrl = URL.createObjectURL(blob)
        const dur = Date.now() - startTsRef.current
        
        const take: Take = {
          id: 'take-' + Date.now(),
          localUrl,
          blob,
          durationMs: dur,
          createdAt: Date.now(),
          isUploading: true, // Start in uploading state
        }

        setTakes(prev => [take, ...prev])
        setSelectedTakeId(take.id)
        
        // --- Start Upload Process ---
        uploadTake(take);

        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }

      setIsRecording(true)
      setDurationMs(0)
      startTsRef.current = Date.now()
      const timer = setInterval(() => {
        setDurationMs(Date.now() - startTsRef.current)
      }, 200)
      ;(rec as any).__timer = timer
      rec.start()
    } catch (e: any) {
      setPermissionError(e?.message || 'Microphone permission denied.')
    }
  }

  const uploadTake = async (take: Take) => {
    const fileName = `${sessionId}/${take.id}.webm`
    
    // BUCKET NAME: 'quotes-bucket'
    const { error } = await supabase.storage
      .from('quotes-bucket') 
      .upload(`audio-recordings/${fileName}`, take.blob)

    if (error) {
      console.error('Supabase upload error:', error.message)
      // Update take to remove uploading state on error
      setTakes(prev => prev.map(t => t.id === take.id ? { ...t, isUploading: false } : t))
      return
    }

    const { data } = supabase.storage
      .from('quotes-bucket')
      .getPublicUrl(`audio-recordings/${fileName}`)

    if (data.publicUrl) {
      // Update take with public URL and remove uploading state
      setTakes(prev => prev.map(t => t.id === take.id ? { ...t, publicUrl: data.publicUrl, isUploading: false } : t))
      // Automatically set the newly recorded take as the one for the parent
      setVoicePublicUrl(data.publicUrl)
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
    URL.revokeObjectURL(selectedTake.localUrl)
    setTakes(prev => prev.filter(t => t.id !== selectedTake.id))
    if (voicePublicUrl === selectedTake.publicUrl) setVoicePublicUrl('')

    const remaining = takes.filter(t => t.id !== selectedTake.id)
    const newSelectedId = remaining.length ? remaining[0].id : null
    setSelectedTakeId(newSelectedId)
    setVoicePublicUrl(remaining.find(t => t.id === newSelectedId)?.publicUrl || '')
  }
  
  const useSelectedForParent = () => {
    if (selectedTake?.publicUrl) {
      setVoicePublicUrl(selectedTake.publicUrl)
    }
  }

  return (
    <div className="grid gap-6">
      {/* ... Notes and Selfie sections (unchanged) ... */}

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
            <button className="btn" onClick={startRecording}>
              {takes.length ? 'Record New Take' : 'Start Recording'}
            </button>
          ) : (
            <button className="btn-secondary btn" onClick={stopRecording}>
              Stop & Save Take
            </button>
          )}

          <span className="text-white/80 text-sm tabular-nums">
            {isRecording ? `Recording ${formatDuration(durationMs)}` : (selectedTake ? `Selected: ${formatDuration(selectedTake.durationMs)}` : 'Idle')}
          </span>

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
                      type="radio" name="take"
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
                    {t.isUploading ? (
                      <span className="text-xs text-white/60 px-3">Uploading...</span>
                    ) : (
                      <audio controls src={t.publicUrl || t.localUrl} className="h-9" />
                    )}
                    <button className="btn-secondary btn" onClick={useSelectedForParent} disabled={t.isUploading || !t.publicUrl}>
                      Use
                    </button>
                    <button className="btn-secondary btn" onClick={discardSelected} disabled={t.isUploading}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
         {voicePublicUrl && <p className="text-xs text-emerald-300/90 self-center mt-3">✓ Final voice is selected and saved.</p>}
      </div>
    </div>
  )
}