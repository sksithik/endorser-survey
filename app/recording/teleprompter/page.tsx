'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation';
import {
  PlayCircle,
  PauseCircle,
  Square,
  Play,
  Pause,
  RotateCcw,
  Type,
  FlipHorizontal,
  Gauge,
  PanelsTopLeft
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link';

export default function TeleprompterPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null);
  const promptScrollRef = useRef<HTMLDivElement | null>(null)

  // Media
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // State
  const [notes, setNotes] = useState('Loading script...');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [videoBlobUrl, setVideoBlobUrl] = useState('')

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0); // 0: Idle, 1: Submagic, 2: Adobe, 3: Completed
  const [finalVideoUrl, setFinalVideoUrl] = useState('');

  const startProcessing = async () => {
    if (!token) return;
    setIsProcessing(true);
    setProcessingStep(1); // Start Submagic

    try {
      // 1. Trigger Processing (Submagic)
      const res = await fetch('/api/video/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();

      if (!data.success || !data.projectId) {
        throw new Error(data.message || 'Failed to start video processing');
      }

      const projectId = data.projectId;

      // 2. Poll for Submagic status
      await new Promise<void>((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/video/status?id=${projectId}&token=${token}`);
            const statusData = await statusRes.json();

            if (statusData.status === 'completed' && statusData.url) {
              clearInterval(pollInterval);
              setFinalVideoUrl(statusData.url); // Use Submagic result as base
              resolve();
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              reject(new Error('Submagic processing failed'));
            }
          } catch (e) {
            console.error('Polling error', e);
          }
        }, 5000);
      });

      // 3. Start Audio Enhancement (Adobe)
      setProcessingStep(2);
      const audioRes = await fetch('/api/audio/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const audioData = await audioRes.json();

      if (!audioData.success) {
        console.warn('Audio enhancement failed, proceeding with video only', audioData.message);
      } else {
        console.log('Audio enhanced:', audioData.url);
      }

      // 4. Transcription (AssemblyAI)
      setProcessingStep(3);
      const transcriptRes = await fetch('/api/transcription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const transcriptData = await transcriptRes.json();

      if (!transcriptData.success) {
        console.warn('Transcription failed', transcriptData.message);
      } else {
        console.log('Transcription complete');
      }

      // 5. Finalizing
      setProcessingStep(4);
      setIsProcessing(false);

    } catch (e: any) {
      console.error(e);
      alert(`Processing failed: ${e.message}`);
      setIsProcessing(false);
      setProcessingStep(0);
    }
  };

  // Teleprompter opts
  const [overlayMode, setOverlayMode] = useState(true)
  const [mirror, setMirror] = useState(false)
  const [fontSize, setFontSize] = useState(28)
  const [lineHeight, setLineHeight] = useState(1.5)
  const [speedPxPerSec, setSpeedPxPerSec] = useState(60)

  // Helpful tips
  const [showTips, setShowTips] = useState(false);
  const helpfulTips = [
    {
      title: 'Lighting',
      content: 'Face a light source like a window or lamp. Avoid having a bright light behind you. Good lighting makes a huge difference!',
    },
    {
      title: 'Microphone',
      content: 'Stay about 1-2 feet away from your microphone for clear audio. If you can, use an external microphone for the best quality.',
    },
    {
      title: 'Framing',
      content: 'Position your camera at eye level. Look directly at the camera lens, not at the screen. Frame yourself from the chest up.',
    },
  ];

  // Autoscroll
  const rAFRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const [autoScroll, setAutoScroll] = useState(false)

  // ====== Setup camera/mic & Load previous video ======
  useEffect(() => {
    const setup = async () => {
      setIsLoading(true);
      // First, check if a video already exists for this session
      if (token) {
        const { data, error } = await supabase
          .from('endorser_invite_sessions')
          .select('video_url, selected_script')
          .eq('id', token)
          .single();

        if (data?.selected_script) {
          setNotes(data.selected_script);
        } else {
          setNotes("No script was saved. Please go back and select a script.");
        }

        if (data?.video_url) {
          setVideoBlobUrl(data.video_url);
          setIsLoading(false);
          return;
        }
        if (error) {
          console.error("Error fetching previous video:", error);
        }
      }

      // If no video, set up the camera for recording
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play().catch(() => { })
        }
      } catch (e) {
        console.error('getUserMedia failed:', e)
        // Handle permission denied error gracefully
      } finally {
        setIsLoading(false);
      }
    }
    setup()
    return () => {
      cancelScroll()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [token])

  // ====== Teleprompter smooth scroll ======
  const scrollLoop = useCallback((ts: number) => {
    if (!autoScroll || !promptScrollRef.current) { rAFRef.current = null; lastTsRef.current = null; return; }
    if (lastTsRef.current == null) lastTsRef.current = ts
    const dt = (ts - lastTsRef.current) / 1000
    lastTsRef.current = ts
    const el = promptScrollRef.current
    const delta = speedPxPerSec * dt
    const maxScroll = el.scrollHeight - el.clientHeight
    const next = Math.min(maxScroll, el.scrollTop + delta)
    el.scrollTop = next
    if (next >= maxScroll - 1) { setAutoScroll(false); rAFRef.current = null; lastTsRef.current = null; return; }
    rAFRef.current = requestAnimationFrame(scrollLoop)
  }, [autoScroll, speedPxPerSec])

  useEffect(() => {
    if (autoScroll && rAFRef.current == null) { rAFRef.current = requestAnimationFrame(scrollLoop) }
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); rAFRef.current = null; lastTsRef.current = null; }
  }, [autoScroll, scrollLoop])

  const startScroll = () => setAutoScroll(true)
  const pauseScroll = () => setAutoScroll(false)
  const resetScroll = () => { setAutoScroll(false); if (promptScrollRef.current) promptScrollRef.current.scrollTop = 0; }
  const cancelScroll = () => { setAutoScroll(false); if (rAFRef.current) cancelAnimationFrame(rAFRef.current); rAFRef.current = null; lastTsRef.current = null; }

  // ====== Recording Logic ======
  const doCountdownThenRecord = async () => {
    setVideoBlobUrl('')
    resetScroll()
    setCountdown(3)
    let n = 3
    const timer = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n === 0) { clearInterval(timer); setCountdown(null); startRecording(); }
    }, 1000)
  }

  const startRecording = () => {
    if (!streamRef.current) return
    try {
      chunksRef.current = []
      const rec = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' })
      recorderRef.current = rec

      rec.onstop = async () => {
        pauseScroll();
        setIsUploading(true);
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        const fileName = `recording-${Date.now()}.webm`;
        const contentType = 'video/webm';

        try {
          const uploadUrlResponse = await fetch('/api/video/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, fileName, contentType }),
          });

          const { success, signedUrl, path } = await uploadUrlResponse.json();

          if (!success || !signedUrl) {
            throw new Error('Could not get an upload URL.');
          }

          const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: videoBlob,
            headers: { 'Content-Type': contentType },
          });

          if (!uploadResponse.ok) {
            throw new Error('Video upload failed.');
          }

          const { data } = supabase.storage
            .from('quotes-bucket')
            .getPublicUrl(path);

          if (data.publicUrl) {
            setVideoBlobUrl(data.publicUrl);
            await fetch('/api/video/save-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, videoUrl: data.publicUrl }),
            });
          } else {
            throw new Error('Could not get public URL for the video.');
          }

        } catch (error: any) {
          console.error(error);
          alert(`Upload process failed: ${error.message}`);
        } finally {
          setIsUploading(false);
        }
      }

      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data) }

      rec.start()
      setIsRecording(true)
      setIsPaused(false)
      startScroll()
    } catch (e) { console.error('record start failed:', e) }
  }

  const pauseRecording = () => { recorderRef.current?.pause(); setIsPaused(true); pauseScroll(); }
  const resumeRecording = () => { recorderRef.current?.resume(); setIsPaused(false); startScroll(); }
  const stopRecording = () => { recorderRef.current?.stop(); setIsRecording(false); setIsPaused(false); }

  const overlayPanelStyle = useMemo(() => ({
    fontSize: `${fontSize}px`, lineHeight,
  }), [fontSize, lineHeight]);

  if (isLoading) {
    return <div className="w-full min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl">
        <div className="grid gap-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <h3 className="text-xl font-semibold">Teleprompter & Camera</h3>
            <p className="text-sm text-white/60">
              {videoBlobUrl ? "Review your recording below, or re-record." : "Record yourself with a scrolling script. Your controls are below the video."}
            </p>
            <div className="mt-4">
              <button onClick={() => setShowTips(!showTips)} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                {showTips ? 'Hide Helpful Tips' : 'Show Helpful Tips'}
              </button>
              {showTips && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {helpfulTips.map((tip) => (
                    <div key={tip.title} className="bg-white/5 border border-white/10 p-4 rounded-lg">
                      <h4 className="font-semibold text-white">{tip.title}</h4>
                      <p className="text-white/70 mt-1">{tip.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conditionally render recorder or preview */}
          {!videoBlobUrl && !isUploading && (
            <div className="card border-white/10 p-0">
              <div className="mx-auto w-full max-w-[1400px]">
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <div className="aspect-[9/16] md:aspect-video bg-black/50 relative">
                    <video
                      ref={videoRef}
                      className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                      muted
                      playsInline
                    />
                    {isRecording && !isPaused && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm font-semibold recording-indicator z-10">
                        <div className="h-3 w-3 bg-red-500 rounded-full" />
                        <span>REC</span>
                      </div>
                    )}
                    {countdown !== null && countdown > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-[20vw] md:text-[12vw] font-extrabold drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                          {countdown}
                        </div>
                      </div>
                    )}
                    {overlayMode && (
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pointer-events-none">
                        <div className="w-full md:w-[80%] lg:w-[70%] px-4 md:px-8 pb-4">
                          <div ref={promptScrollRef} className="w-full overflow-y-hidden rounded-xl relative bg-black/80" style={{ height: '70vh', maxHeight: '100%' }}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/80 to-transparent" />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent" />
                            <div className={`text-white whitespace-pre-wrap px-4 py-5 ${mirror ? 'scale-x-[-1]' : ''}`} style={overlayPanelStyle}>
                              {notes || 'No script available.'}
                            </div>
                            <div className="h-24" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm p-3 z-20">
                      <div className="flex items-center justify-between gap-4 w-full max-w-6xl mx-auto">
                        <div className="flex flex-wrap items-center gap-3">
                          <button type="button" className="icon-btn" title="Toggle overlay" onClick={() => setOverlayMode(v => !v)}><PanelsTopLeft className="h-5 w-5" /></button>
                          <button type="button" className="icon-btn" title="Mirror video" onClick={() => setMirror(v => !v)}><FlipHorizontal className="h-5 w-5" /></button>
                          <div className="hidden md:flex items-center gap-2"><Gauge className="h-4 w-4 opacity-70" /><input type="range" min={10} max={200} step={5} value={speedPxPerSec} onChange={(e) => setSpeedPxPerSec(parseInt(e.target.value))} className="w-24" title="Scroll speed" /></div>
                          <div className="hidden md:flex items-center gap-2"><Type className="h-4 w-4 opacity-70" /><input type="range" min={18} max={48} step={1} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-24" title="Font size" /></div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!isRecording ? (<button className="control-btn-main" onClick={doCountdownThenRecord} title="Start Recording"><PlayCircle className="h-7 w-7" /></button>) : (<>{!isPaused ? (<button className="control-btn-main" onClick={pauseRecording} title="Pause"><PauseCircle className="h-7 w-7" /></button>) : (<button className="control-btn-main" onClick={resumeRecording} title="Resume"><Play className="h-7 w-7" /></button>)}<button className="control-btn-stop" onClick={stopRecording} title="Stop Recording"><Square className="h-7 w-7" /></button></>)}
                        </div>
                        <div className="flex items-center gap-3">
                          {!autoScroll ? (<button className="icon-btn" onClick={startScroll} title="Start Scroll" disabled={isPaused}><Play className="h-5 w-5" /></button>) : (<button className="icon-btn" onClick={pauseScroll} title="Pause Scroll"><Pause className="h-5 w-5" /></button>)}
                          <button className="icon-btn" onClick={resetScroll} title="Reset Scroll"><RotateCcw className="h-5 w-5" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(isUploading || videoBlobUrl) && (
            <div className="card">
              <div className="mx-auto w-full max-w-[1400px]">
                {isUploading ? (
                  <div className="text-center py-8">
                    <h3 className="text-xl font-semibold mb-3">Uploading your video...</h3>
                    <p className="text-white/60">Please wait, this may take a moment.</p>
                  </div>
                ) : isProcessing ? (
                  <div className="text-center py-8">
                    <h3 className="text-xl font-semibold mb-3">AI Magic in Progress...</h3>
                    <div className="flex flex-col gap-4 max-w-md mx-auto mb-6">

                      {/* Step 1: Video Polish */}
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${processingStep >= 1 ? 'bg-blue-600 border-blue-600' : 'border-white/20'}`}>
                          {processingStep > 1 ? '✓' : '1'}
                        </div>
                        <div className={`text-left ${processingStep === 1 ? 'text-white font-semibold' : 'text-white/50'}`}>
                          <p>Video Polish (Submagic)</p>
                          {processingStep === 1 && <p className="text-xs text-blue-400">Removing fillers, fixing eye contact...</p>}
                        </div>
                      </div>

                      {/* Step 2: Audio Enhancement */}
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${processingStep >= 2 ? 'bg-blue-600 border-blue-600' : 'border-white/20'}`}>
                          {processingStep > 2 ? '✓' : '2'}
                        </div>
                        <div className={`text-left ${processingStep === 2 ? 'text-white font-semibold' : 'text-white/50'}`}>
                          <p>Audio Enhancement (Adobe)</p>
                          {processingStep === 2 && <p className="text-xs text-blue-400">Studio-quality voice processing...</p>}
                        </div>
                      </div>

                      {/* Step 3: Transcription */}
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${processingStep >= 3 ? 'bg-blue-600 border-blue-600' : 'border-white/20'}`}>
                          {processingStep > 3 ? '✓' : '3'}
                        </div>
                        <div className={`text-left ${processingStep === 3 ? 'text-white font-semibold' : 'text-white/50'}`}>
                          <p>Transcription (AssemblyAI)</p>
                          {processingStep === 3 && <p className="text-xs text-blue-400">Generating transcript...</p>}
                        </div>
                      </div>

                      {/* Step 4: Finalizing */}
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${processingStep >= 4 ? 'bg-green-600 border-green-600' : 'border-white/20'}`}>
                          {processingStep === 4 ? '✓' : '4'}
                        </div>
                        <div className={`text-left ${processingStep === 4 ? 'text-white font-semibold' : 'text-white/50'}`}>
                          <p>Finalizing</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-md mx-auto bg-gray-700 rounded-full h-2.5 mb-4 overflow-hidden">
                      <div className="bg-blue-600 h-2.5 rounded-full animate-progress-indeterminate" style={{ width: processingStep === 1 ? '30%' : processingStep === 2 ? '60%' : '90%' }}></div>
                    </div>
                    <p className="text-xs text-white/40">This usually takes 1-2 minutes.</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Your Recording</h3>
                    <video src={finalVideoUrl || videoBlobUrl} controls className="w-full rounded-lg" />
                    <div className="mt-2 flex gap-3">
                      <a className="btn" href={finalVideoUrl || videoBlobUrl} download={`recording-${Date.now()}.webm`}>Download</a>
                      {!finalVideoUrl && (
                        <button className="btn-primary btn" onClick={startProcessing}>
                          ✨ Enhance with AI
                        </button>
                      )}
                      <button className="btn-secondary btn" onClick={() => { setVideoBlobUrl(''); setFinalVideoUrl(''); setProcessingStep(0); }}>Re-record</button>
                      <Link href={`/share?token=${token}`} className="btn">Next</Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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
    </div >
  )
}
