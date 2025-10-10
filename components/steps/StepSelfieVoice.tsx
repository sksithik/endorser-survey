'use client'
import { useEffect } from 'react'
import SelfieCapture from '@/components/SelfieCapture'
import { supabase } from '@/lib/supabaseClient'

// simple voice recorder using MediaRecorder
function useVoiceRecorder(onUrl: (url: string) => void) {
  let mediaRecorder: MediaRecorder | null = null
  let chunks: BlobPart[] = []

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    chunks = []
    mediaRecorder.ondataavailable = e => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      onUrl(URL.createObjectURL(blob))
      stream.getTracks().forEach(t => t.stop())
    }
    mediaRecorder.start()
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
    }
  }

  const stop = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
  }

  return { start, stop }
}

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

export default function StepSelfieVoice({
  notes, selfie, setSelfie, selfiePublicUrl, setSelfiePublicUrl,
  voiceBlobUrl, setVoiceBlobUrl, sessionId
}: Props) {

  // Upload selfie to Supabase (same helper behavior as before)
  const dataURLtoFile = (dataurl: string, filename: string) => {
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

  const { start, stop } = useVoiceRecorder(setVoiceBlobUrl)

  return (
    <div className="grid gap-6">
      {/* Notes preview (read-only hint) */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Script (for reference)</h3>
        <p className="text-sm text-white/60 mb-3">Record your own voice reading this script.</p>
        <div className="text-sm bg-white/5 p-4 rounded-xl border border-white/10 whitespace-pre-wrap">
          {notes || 'No notes yet.'}
        </div>
      </div>

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

      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Record Your Voice</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn" onClick={start}>Start Recording</button>
          <button className="btn-secondary btn" onClick={stop}>Stop</button>
          <span className="text-white/70 text-sm">
            {voiceBlobUrl ? 'Recorded ✓' : 'Idle'}
          </span>
        </div>
        {voiceBlobUrl && (
          <div className="mt-3">
            <audio controls src={voiceBlobUrl} className="w-full" />
            <div className="mt-2 flex gap-3">
              <a className="btn-secondary btn" href={voiceBlobUrl} download="voice.webm">Download Voice</a>
              <button className="btn-secondary btn" onClick={() => setVoiceBlobUrl('')}>Re-record</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
