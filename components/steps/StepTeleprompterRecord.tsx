'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  notes: string
  videoBlobUrl: string
  setVideoBlobUrl: (u: string) => void
}

export default function StepTeleprompterRecord({ notes, videoBlobUrl, setVideoBlobUrl }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const promptScrollRef = useRef<HTMLDivElement | null>(null)

  // Media
  const [stream, setStream] = useState<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Layout / Teleprompter opts
  const [overlayMode, setOverlayMode] = useState(true) // overlay vs split removed; overlay is most requested
  const [mirror, setMirror] = useState(false)
  const [fontSize, setFontSize] = useState(28)
  const [lineHeight, setLineHeight] = useState(1.5)
  const [overlayOpacity, setOverlayOpacity] = useState(0.85)
  const [windowHeightPct, setWindowHeightPct] = useState(70) // teleprompter window height % of video
  const [speedPxPerSec, setSpeedPxPerSec] = useState(120) // smooth scroll speed

  // Smooth autoscroll loop
  const rAFRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const [autoScroll, setAutoScroll] = useState(false)

  // ====== Setup camera/mic ======
  useEffect(() => {
    const setup = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play().catch(() => {})
        }
      } catch (e) {
        console.error('getUserMedia failed:', e)
      }
    }
    setup()
    return () => {
      cancelScroll()
      stream?.getTracks().forEach(t => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ====== Fullscreen helpers ======
  const requestFs = async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (el.requestFullscreen) await el.requestFullscreen()
      // @ts-ignore
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
      // @ts-ignore
      else if (el.msRequestFullscreen) el.msRequestFullscreen()
    } catch {}
    // Try to go iOS native fullscreen on the video if possible (Safari)
    try {
      // @ts-ignore
      if (videoRef.current?.webkitEnterFullScreen) videoRef.current.webkitEnterFullScreen()
    } catch {}
    // Try orientation lock (best-effort)
    try {
      // @ts-ignore
      await screen.orientation?.lock?.('landscape')
    } catch {}
  }

  const exitFs = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      // @ts-ignore
      else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.()
    } catch {}
    try {
      // @ts-ignore
      await screen.orientation?.unlock?.()
    } catch {}
  }

  // ====== Teleprompter smooth scroll ======
  const scrollLoop = useCallback((ts: number) => {
    if (!autoScroll || !promptScrollRef.current) {
      rAFRef.current = null
      lastTsRef.current = null
      return
    }
    if (lastTsRef.current == null) lastTsRef.current = ts
    const dt = (ts - lastTsRef.current) / 1000 // seconds
    lastTsRef.current = ts

    const el = promptScrollRef.current
    const delta = speedPxPerSec * dt
    const maxScroll = el.scrollHeight - el.clientHeight
    const next = Math.min(maxScroll, el.scrollTop + delta)
    el.scrollTop = next

    // stop auto when at bottom
    if (next >= maxScroll - 1) {
      setAutoScroll(false)
      rAFRef.current = null
      lastTsRef.current = null
      return
    }
    rAFRef.current = requestAnimationFrame(scrollLoop)
  }, [autoScroll, speedPxPerSec])

  useEffect(() => {
    if (autoScroll && rAFRef.current == null) {
      rAFRef.current = requestAnimationFrame(scrollLoop)
    }
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current)
      rAFRef.current = null
      lastTsRef.current = null
    }
  }, [autoScroll, scrollLoop])

  const startScroll = () => setAutoScroll(true)
  const pauseScroll = () => setAutoScroll(false)
  const resetScroll = () => {
    setAutoScroll(false)
    if (promptScrollRef.current) promptScrollRef.current.scrollTop = 0
  }
  const cancelScroll = () => {
    setAutoScroll(false)
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current)
    rAFRef.current = null
    lastTsRef.current = null
  }

  // ====== Recording ======
  const doCountdownThenRecord = async () => {
    setVideoBlobUrl('')
    resetScroll()
    await requestFs()
    setCountdown(3)
    let n = 3
    const timer = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n === 0) {
        clearInterval(timer)
        setCountdown(null)
        startRecording()
      }
    }, 1000)
  }

  const startRecording = () => {
    if (!stream) return
    try {
      chunksRef.current = []
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' })
      recorderRef.current = rec
      setIsRecording(true)
      setIsPaused(false)
      startScroll()

      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        pauseScroll()
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setVideoBlobUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        setIsPaused(false)
        await exitFs()
      }

      rec.start()
    } catch (e) {
      console.error('record start failed:', e)
    }
  }

  const pauseRecording = () => {
    try {
      recorderRef.current?.pause()
      setIsPaused(true)
      pauseScroll()
    } catch {}
  }

  const resumeRecording = () => {
    try {
      recorderRef.current?.resume()
      setIsPaused(false)
      startScroll()
    } catch {}
  }

  const stopRecording = async () => {
    try {
      recorderRef.current?.stop()
    } catch {}
  }

  // ====== Derived styles ======
  const overlayPanelStyle = useMemo(() => ({
    fontSize: `${fontSize}px`,
    lineHeight,
    backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
    height: `${windowHeightPct}vh`,
    maxHeight: '100%',
  }), [fontSize, lineHeight, overlayOpacity, windowHeightPct])

  return (
    <div className="grid gap-6">
      <div ref={containerRef} className="card border-white/10">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-semibold">Teleprompter & Camera</h3>
              <p className="text-sm text-white/60">Countdown overlays on video. Recording goes fullscreen automatically.</p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" className="accent-blue-500" checked={overlayMode} onChange={e => setOverlayMode(e.target.checked)} />
                Overlay text on video
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" className="accent-blue-500" checked={mirror} onChange={e => setMirror(e.target.checked)} />
                Mirror
              </label>

              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Speed</span>
                <input type="range" min={0} max={400} step={10} value={speedPxPerSec} onChange={(e)=>setSpeedPxPerSec(parseInt(e.target.value))} className="w-32" />
                <span className="text-sm text-white/60 w-12">{speedPxPerSec}px/s</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Size</span>
                <input type="range" min={18} max={48} step={1} value={fontSize} onChange={(e)=>setFontSize(parseInt(e.target.value))} className="w-32" />
                <span className="text-sm text-white/60 w-10">{fontSize}px</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">Line</span>
                <input type="range" min={1.2} max={2.0} step={0.05} value={lineHeight} onChange={(e)=>setLineHeight(parseFloat(e.target.value))} className="w-28" />
                <span className="text-sm text-white/60 w-10">{lineHeight.toFixed(2)}</span>
              </div>

              {overlayMode && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70">Overlay</span>
                    <input type="range" min={0.3} max={0.95} step={0.05} value={overlayOpacity} onChange={(e)=>setOverlayOpacity(parseFloat(e.target.value))} className="w-28" />
                    <span className="text-sm text-white/60 w-10">{overlayOpacity.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70">Win H</span>
                    <input type="range" min={40} max={90} step={2} value={windowHeightPct} onChange={(e)=>setWindowHeightPct(parseInt(e.target.value))} className="w-28" />
                    <span className="text-sm text-white/60 w-12">{windowHeightPct}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* MAIN AREA */}
          <div className="relative mt-4 rounded-xl overflow-hidden border border-white/10">
            <div className="aspect-video bg-black/50 relative">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                muted
                playsInline
              />

              {/* COUNTDOWN overlay */}
              {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[18vw] md:text-[12vw] font-extrabold drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                    {countdown}
                  </div>
                </div>
              )}

              {/* TELEPROMPTER overlay */}
              {overlayMode && (
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pointer-events-none">
                  <div className="w-full md:w-[80%] lg:w-[70%] px-4 md:px-8 pb-4">
                    <div
                      ref={promptScrollRef}
                      className="w-full overflow-y-hidden rounded-xl relative"
                      style={overlayPanelStyle}
                    >
                      {/* gradient fades */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent" />

                      <div
                        className={`text-white whitespace-pre-wrap px-4 py-5 ${mirror ? 'scale-x-[-1]' : ''}`}
                        style={{ lineHeight }}
                      >
                        {notes || 'No script available.'}
                      </div>
                      <div className="h-24" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!isRecording ? (
              <button className="btn" onClick={doCountdownThenRecord}>Start (3-2-1)</button>
            ) : (
              <>
                {!isPaused ? (
                  <button className="btn-secondary btn" onClick={pauseRecording}>Pause</button>
                ) : (
                  <button className="btn" onClick={resumeRecording}>Resume</button>
                )}
                <button className="btn-secondary btn" onClick={stopRecording}>Stop</button>
              </>
            )}

            {/* Teleprompter controls */}
            <div className="h-6 w-px bg-white/20 mx-1" />
            {!autoScroll ? (
              <button className="btn-secondary btn" onClick={startScroll} disabled={isPaused}>
                Scroll
              </button>
            ) : (
              <button className="btn-secondary btn" onClick={pauseScroll}>
                Pause Scroll
              </button>
            )}
            <button className="btn-secondary btn" onClick={resetScroll}>Reset</button>
          </div>
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
