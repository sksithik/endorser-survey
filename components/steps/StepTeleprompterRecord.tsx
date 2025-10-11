'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PlayCircle,
  PauseCircle,
  Square,
  Play,
  Pause,
  RotateCcw,
  Type,
  PanelBottom,
  FlipHorizontal,
  Gauge,
  PanelsTopLeft
} from 'lucide-react'

type Props = {
  notes: string
  videoBlobUrl: string
  setVideoBlobUrl: (u: string) => void
}

export default function StepTeleprompterRecord({ notes, videoBlobUrl, setVideoBlobUrl }: Props) {
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

  // Teleprompter opts
  const [overlayMode, setOverlayMode] = useState(true)
  const [mirror, setMirror] = useState(false)
  const [fontSize, setFontSize] = useState(28)
  const [lineHeight, setLineHeight] = useState(1.5)
  const [overlayOpacity, setOverlayOpacity] = useState(0.85)
  const [windowHeightPct, setWindowHeightPct] = useState(70)
  const [speedPxPerSec, setSpeedPxPerSec] = useState(60)

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


  // ====== Teleprompter smooth scroll ======
  const scrollLoop = useCallback((ts: number) => {
    if (!autoScroll || !promptScrollRef.current) {
      rAFRef.current = null
      lastTsRef.current = null
      return
    }
    if (lastTsRef.current == null) lastTsRef.current = ts
    const dt = (ts - lastTsRef.current) / 1000
    lastTsRef.current = ts

    const el = promptScrollRef.current
    const delta = speedPxPerSec * dt
    const maxScroll = el.scrollHeight - el.clientHeight
    const next = Math.min(maxScroll, el.scrollTop + delta)
    el.scrollTop = next

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
    // Fullscreen logic removed
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
        // Fullscreen logic removed
      }

      rec.start()
    } catch (e) {
      console.error('record start failed:', e)
    }
  }

  const pauseRecording = () => {
    recorderRef.current?.pause()
    setIsPaused(true)
    pauseScroll()
  }

  const resumeRecording = () => {
    recorderRef.current?.resume()
    setIsPaused(false)
    startScroll()
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
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
      <div className="mx-auto w-full max-w-[1400px]">
        <h3 className="text-xl font-semibold">Teleprompter & Camera</h3>
        <p className="text-sm text-white/60">
          Record yourself with a scrolling script. Your controls are below the video.
        </p>
      </div>

      {/* === Main video area with integrated controls === */}
      <div className="card border-white/10 p-0">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="relative rounded-xl overflow-hidden border border-white/10">
            <div className="aspect-video bg-black/50 relative">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                muted
                playsInline
              />

              {/* === NEW: Recording Indicator === */}
              {isRecording && !isPaused && (
                 <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm font-semibold recording-indicator z-10">
                  <div className="h-3 w-3 bg-red-500 rounded-full" />
                  <span>REC</span>
                </div>
              )}

              {/* COUNTDOWN overlay on video */}
              {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="text-[20vw] md:text-[12vw] font-extrabold drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
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

              {/* === NEW: Unified Control Bar === */}
              <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm p-3 z-20">
                <div className="flex items-center justify-between gap-4 w-full max-w-6xl mx-auto">
                  {/* Left Controls: Prompter Settings */}
                  <div className="flex flex-wrap items-center gap-3">
                     <button type="button" className="icon-btn" title="Toggle overlay mode" onClick={() => setOverlayMode(v => !v)}>
                      <PanelsTopLeft className="h-5 w-5" />
                    </button>
                    <button type="button" className="icon-btn" title="Mirror video & text" onClick={() => setMirror(v => !v)}>
                      <FlipHorizontal className="h-5 w-5" />
                    </button>
                    <div className="hidden md:flex items-center gap-2">
                        <Gauge className="h-4 w-4 opacity-70" />
                        <input type="range" min={10} max={200} step={5} value={speedPxPerSec} onChange={(e)=>setSpeedPxPerSec(parseInt(e.target.value))} className="w-24" title="Scroll speed" />
                    </div>
                     <div className="hidden md:flex items-center gap-2">
                        <Type className="h-4 w-4 opacity-70" />
                        <input type="range" min={18} max={48} step={1} value={fontSize} onChange={(e)=>setFontSize(parseInt(e.target.value))} className="w-24" title="Font size" />
                    </div>
                  </div>

                  {/* Center Controls: Recording */}
                  <div className="flex items-center gap-3">
                    {!isRecording ? (
                        <button className="control-btn-main" onClick={doCountdownThenRecord} title="Start Recording">
                          <PlayCircle className="h-7 w-7" />
                        </button>
                      ) : (
                        <>
                          {!isPaused ? (
                            <button className="control-btn-main" onClick={pauseRecording} title="Pause">
                              <PauseCircle className="h-7 w-7" />
                            </button>
                          ) : (
                            <button className="control-btn-main" onClick={resumeRecording} title="Resume">
                              <Play className="h-7 w-7" />
                            </button>
                          )}
                          <button className="control-btn-stop" onClick={stopRecording} title="Stop Recording">
                            <Square className="h-7 w-7" />
                          </button>
                        </>
                      )}
                  </div>
                  
                  {/* Right Controls: Prompter Actions */}
                  <div className="flex items-center gap-3">
                      {!autoScroll ? (
                        <button className="icon-btn" onClick={startScroll} title="Start Scroll" disabled={isPaused}>
                          <Play className="h-5 w-5" />
                        </button>
                      ) : (
                        <button className="icon-btn" onClick={pauseScroll} title="Pause Scroll">
                          <Pause className="h-5 w-5" />
                        </button>
                      )}
                      <button className="icon-btn" onClick={resetScroll} title="Reset Scroll">
                        <RotateCcw className="h-5 w-5" />
                      </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === Output === */}
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

      {/* Local styles */}
      <style jsx>{`
        .icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          height: 40px; width: 40px; border-radius: 9999px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          transition: background-color 0.2s;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.2); }
        .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .control-btn-main {
          display: inline-flex; align-items: center; justify-content: center;
          height: 52px; width: 52px; border-radius: 9999px;
          background: rgba(255,255,255,0.9);
          color: black;
          transition: transform 0.2s;
        }
        .control-btn-main:hover { transform: scale(1.05); }

        .control-btn-stop {
          display: inline-flex; align-items: center; justify-content: center;
          height: 52px; width: 52px; border-radius: 9999px;
          background: #ef4444; /* red-500 */
          color: white;
          transition: background-color 0.2s;
        }
        .control-btn-stop:hover { background: #dc2626; /* red-600 */ }

        @keyframes pulse-fade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .recording-indicator {
          animation: pulse-fade 1.5s infinite;
        }
      `}</style>
    </div>
  )
}