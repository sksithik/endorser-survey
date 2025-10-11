'use client'
import { useEffect, useRef, useState, useMemo } from 'react'

type Props = {
  notes: string
  videoBlobUrl: string
  setVideoBlobUrl: (u: string) => void
}

/**
 * Teleprompter step with:
 * - Wide desktop container (max-w-[1400px])
 * - Split mode (video left, prompter right) and Overlay mode (text over video)
 * - 3-2-1 countdown
 * - Scroll speed, font size, line height, overlay opacity, mirror
 */
export default function StepTeleprompterRecord({ notes, videoBlobUrl, setVideoBlobUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Layout / teleprompter controls
  const [layoutMode, setLayoutMode] = useState<'overlay' | 'split'>('overlay')
  const [scrollSpeed, setScrollSpeed] = useState(1.2) // px per frame
  const [fontSizePx, setFontSizePx] = useState(26)   // overlay/split text size
  const [lineHeight, setLineHeight] = useState(1.5)
  const [overlayOpacity, setOverlayOpacity] = useState(0.85)
  const [mirror, setMirror] = useState(false)

  // Prompter scroller
  const promptRef = useRef<HTMLDivElement | null>(null)
  const scrollerRef = useRef<number | null>(null)

  // Derived styles
  const overlayStyle = useMemo(() => ({
    fontSize: `${fontSizePx}px`,
    lineHeight,
    backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
  }), [fontSizePx, lineHeight, overlayOpacity])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // init camera/mic

  const startScroll = () => {
    const step = () => {
      if (!promptRef.current) return
      promptRef.current.scrollTop += scrollSpeed
      scrollerRef.current = requestAnimationFrame(step)
    }
    if (!scrollerRef.current) {
      scrollerRef.current = requestAnimationFrame(step)
    }
  }

  const pauseScroll = () => {
    if (scrollerRef.current) cancelAnimationFrame(scrollerRef.current)
    scrollerRef.current = null
  }

  const resetScroll = () => {
    if (promptRef.current) promptRef.current.scrollTop = 0
  }

  const doCountdownThenRecord = async () => {
    setVideoBlobUrl('')
    resetScroll()
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
      pauseScroll()
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
      {/* WIDE CONTAINER */}
      <div className="card border-white/10">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold">Teleprompter & Camera</h3>
              <p className="text-sm text-white/60">Use the teleprompter below. Adjust speed and text to match your pace.</p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Layout toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Layout</span>
                <div className="inline-flex rounded-xl overflow-hidden border border-white/10">
                  <button
                    className={`px-3 py-1 text-sm ${layoutMode==='overlay' ? 'bg-white/10' : 'bg-transparent'}`}
                    onClick={() => setLayoutMode('overlay')}
                  >
                    Overlay
                  </button>
                  <button
                    className={`px-3 py-1 text-sm ${layoutMode==='split' ? 'bg-white/10' : 'bg-transparent'}`}
                    onClick={() => setLayoutMode('split')}
                  >
                    Split
                  </button>
                </div>
              </div>

              {/* Mirror */}
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" className="accent-blue-500" checked={mirror} onChange={e => setMirror(e.target.checked)} />
                Mirror
              </label>

              {/* Speed */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Speed</span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-white/60 w-10">{scrollSpeed.toFixed(1)}</span>
              </div>

              {/* Font size */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Size</span>
                <input
                  type="range"
                  min={16}
                  max={48}
                  step={1}
                  value={fontSizePx}
                  onChange={(e) => setFontSizePx(parseInt(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-white/60 w-10">{fontSizePx}px</span>
              </div>

              {/* Line height */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Line</span>
                <input
                  type="range"
                  min={1.2}
                  max={2.0}
                  step={0.05}
                  value={lineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-28"
                />
                <span className="text-sm text-white/60 w-10">{lineHeight.toFixed(2)}</span>
              </div>

              {/* Overlay opacity (only for overlay mode) */}
              {layoutMode === 'overlay' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">Overlay</span>
                  <input
                    type="range"
                    min={0.3}
                    max={0.95}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                    className="w-28"
                  />
                  <span className="text-sm text-white/60 w-10">{overlayOpacity.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* MAIN AREA */}
          {layoutMode === 'overlay' ? (
            // OVERLAY MODE: video full width, text over it
            <div className="relative mt-4 rounded-xl overflow-hidden border border-white/10">
              <div className="aspect-video bg-black/50">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                  muted
                  playsInline
                />
              </div>

              {/* Overlay prompt (scrolling) */}
              <div
                ref={promptRef}
                className="absolute inset-0 overflow-hidden"
                style={{ pointerEvents: 'none' }} // click-through so buttons below still work if needed
              >
                {/* Dim background panel for legibility */}
                <div
                  className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center px-6 md:px-10"
                  style={overlayStyle}
                >
                  <div
                    className="max-w-3xl w-full h-[70%] md:h-[75%] overflow-y-hidden rounded-xl px-6 py-6 relative"
                    style={{ pointerEvents: 'auto' }} // allow wheel/touch to scroll if desired
                  >
                    {/* gradient fades */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent" />

                    <div
                      className={`whitespace-pre-wrap text-white tracking-wide ${mirror ? 'scale-x-[-1]' : ''}`}
                      style={{ lineHeight }}
                    >
                      {notes || 'No script available.'}
                    </div>

                    {/* pad the end so lines clear the fade */}
                    <div className="h-16" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // SPLIT MODE: video left, prompter right
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                  muted
                  playsInline
                />
              </div>

              <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                <div
                  ref={promptRef}
                  className="max-h-[420px] h-[420px] overflow-y-hidden"
                  style={{ fontSize: `${fontSizePx}px`, lineHeight }}
                >
                  <div className={`whitespace-pre-wrap ${mirror ? 'scale-x-[-1]' : ''}`}>
                    {notes || 'No script available.'}
                  </div>
                  <div className="h-20" />
                </div>
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!isRecording ? (
              <button className="btn" onClick={doCountdownThenRecord}>Start</button>
            ) : (
              <button className="btn-secondary btn" onClick={stopRecording}>Stop</button>
            )}
            <button className="btn-secondary btn" onClick={startScroll} disabled={!!scrollerRef.current || isRecording}>
              Scroll
            </button>
            <button className="btn-secondary btn" onClick={pauseScroll}>
              Pause
            </button>
            <button className="btn-secondary btn" onClick={resetScroll}>
              Reset
            </button>
          </div>

          {/* Countdown */}
          {countdown !== null && countdown > 0 && (
            <div className="mt-3 text-center text-5xl font-extrabold">{countdown}</div>
          )}
        </div>
      </div>

      {/* OUTPUT */}
      {videoBlobUrl && (
        <div className="card">
          <div className="mx-auto w-full max-w-[1400px]">
            <h3 className="text-xl font-semibold mb-3">Your Recording</h3>
            <video src={videoBlobUrl} controls className="w-full rounded-lg" />
            <div className="mt-2 flex gap-3">
              <a className="btn" href={videoBlobUrl} download="teleprompter_recording.webm">Download</a>
              <button className="btn-secondary btn" onClick={() => setVideoBlobUrl('')}>Re-record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
