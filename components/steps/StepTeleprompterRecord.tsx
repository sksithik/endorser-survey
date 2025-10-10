'use client'
import { useEffect, useRef, useState } from 'react'

type Props = {
  notes: string
  videoBlobUrl: string
  setVideoBlobUrl: (u: string) => void
}

export default function StepTeleprompterRecord({ notes, videoBlobUrl, setVideoBlobUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [scrollSpeed, setScrollSpeed] = useState(1.0) // px per frame
  const promptRef = useRef<HTMLDivElement | null>(null)
  const scrollerRef = useRef<number | null>(null)

  useEffect(() => {
    const setup = async () => {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play().catch(() => {})
      }
    }
    setup()
    return () => {
      if (scrollerRef.current) cancelAnimationFrame(scrollerRef.current)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, []) // init camera/mic

  const startScroll = () => {
    const step = () => {
      if (!promptRef.current) return
      promptRef.current.scrollTop += scrollSpeed
      scrollerRef.current = requestAnimationFrame(step)
    }
    scrollerRef.current = requestAnimationFrame(step)
  }

  const stopScroll = () => {
    if (scrollerRef.current) cancelAnimationFrame(scrollerRef.current)
    scrollerRef.current = null
  }

  const doCountdownThenRecord = async () => {
    setVideoBlobUrl('')
    setCountdown(3)
    let n = 3
    const tick = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n === 0) {
        clearInterval(tick)
        setCountdown(null)
        startRecording()
      }
    }, 1000)
  }

  const startRecording = () => {
    if (!stream) return
    chunksRef.current = []
    const r = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' })
    setRecorder(r)
    setIsRecording(true)
    startScroll()
    r.ondataavailable = (e) => chunksRef.current.push(e.data)
    r.onstop = () => {
      stopScroll()
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setVideoBlobUrl(URL.createObjectURL(blob))
      setIsRecording(false)
    }
    r.start()
  }

  const stopRecording = () => {
    recorder?.stop()
  }

  return (
    <div className="grid gap-6">
      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Teleprompter & Camera</h3>
        <p className="text-sm text-white/60 mb-3">Use the teleprompter below. Adjust speed to match your pace.</p>

        {/* Camera preview */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {!isRecording ? (
                <button className="btn" onClick={doCountdownThenRecord}>Start (3-2-1)</button>
              ) : (
                <button className="btn-secondary btn" onClick={stopRecording}>Stop</button>
              )}
              <label className="text-sm text-white/70">Speed</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.25}
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                className="w-40"
              />
              <span className="text-sm text-white/70">{scrollSpeed.toFixed(2)} px/frame</span>
            </div>
            {countdown !== null && countdown > 0 && (
              <div className="mt-3 text-center text-5xl font-extrabold">{countdown}</div>
            )}
          </div>

          {/* Teleprompter */}
          <div>
            <div
              ref={promptRef}
              className="h-full max-h-[320px] overflow-y-hidden leading-8 rounded-xl bg-white/5 p-4 border border-white/10"
              style={{ scrollBehavior: 'auto' }}
            >
              <div className="text-lg whitespace-pre-wrap">{notes || 'No script available.'}</div>
              <div className="h-20" />
            </div>
            <div className="mt-2 flex gap-3">
              <button className="btn-secondary btn" onClick={startScroll} disabled={isRecording}>Scroll</button>
              <button className="btn-secondary btn" onClick={stopScroll}>Pause</button>
            </div>
          </div>
        </div>
      </div>

      {/* Output */}
      {videoBlobUrl && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-3">Your Recording</h3>
          <video src={videoBlobUrl} controls className="w-full rounded-lg" />
          <div className="mt-2 flex gap-3">
            <a className="btn" href={videoBlobUrl} download="teleprompter_recording.webm">Download</a>
            <button className="btn-secondary btn" onClick={() => setVideoBlobUrl('')}>Re-record</button>
          </div>
        </div>
      )}
    </div>
  )
}
