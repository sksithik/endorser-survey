'use client'
import { useEffect, useRef, useState } from 'react'

type Props = {
  selfieDataUrl: string
  scriptText: string
}

// A simple local "AI-talking" effect: we render the selfie onto a canvas and flap a
// mouth rectangle synced to microphone loudness while we teleprompt the generated notes.
// We record the canvas + mic to WebM using MediaRecorder so users get a shareable file.
export default function VideoGenerator({ selfieDataUrl, scriptText }: Props){
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [recording, setRecording] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [prompting, setPrompting] = useState(false)

  const startRecording = async ()=>{
    setErr(null)
    setBlobUrl(null)
    const canvas = canvasRef.current
    if(!canvas){ setErr('No canvas'); return }
    const stream = (canvas as any).captureStream?.(30) as MediaStream
    if(!stream){ setErr('Canvas capture not supported'); return }
    // Mic
    let mic: MediaStream | null = null
    try{
      mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      mic.getAudioTracks().forEach(t=>stream.addTrack(t))
    }catch(e){
      setErr('Microphone permission denied. Recording video only.')
    }
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' })
    const chunks: BlobPart[] = []
    rec.ondataavailable = (e)=>{ if(e.data.size>0) chunks.push(e.data) }
    rec.onstop = ()=>{
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setRecording(false)
    }
    rec.start()
    setRecording(true)
    setTimeout(()=>{ rec.stop() }, Math.min(120, Math.max(10, Math.ceil(scriptText.length/20))) * 1000)
  }

  // Render loop: draw selfie and simple mouth animation tied to synthetic beat
  useEffect(()=>{
    let raf = 0
    let img = new Image()
    let t0 = performance.now()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if(!canvas || !ctx) return
    let w = (canvas.width = 720)
    let h = (canvas.height = 1280)

    img.onload = ()=>{ loop() }
    img.src = selfieDataUrl || ''

    function loop(){
      if (!ctx) return;
      const t = (performance.now() - t0) / 1000
      // Background
      ctx.fillStyle = '#0c0c10'
      ctx.fillRect(0,0,w,h)
      // Image with subtle zoom/pan
      const scale = 1.05 + Math.sin(t*0.2)*0.02
      const iw = w*scale
      const ih = h*scale
      const ix = (w - iw)/2
      const iy = (h - ih)/2
      if(img.complete && img.naturalWidth>0){
        ctx.drawImage(img, ix, iy, iw, ih)
      }
      // Face mouth rectangle (fake lip sync)
      const mx = w*0.38, my = h*0.57, mw = w*0.24, mhBase = h*0.018
      const mh = mhBase + (Math.sin(t*6)+1)*mhBase*0.8
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.fillRect(mx, my, mw, mh)

      // Teleprompter
      const lines = wrapText(ctx, scriptText, w*0.84)
      const y0 = h*0.74
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(w*0.08, y0-24, w*0.84, Math.min(h*0.2, lines.length*24+32))
      ctx.fillStyle = '#fff'
      ctx.font = '20px system-ui, -apple-system, Segoe UI'
      let yy = y0
      for(const line of lines.slice(0,8)){
        ctx.fillText(line, w*0.1, yy)
        yy += 24
      }

      raf = requestAnimationFrame(loop)
    }

    function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number){
      const words = text.split(' ')
      const lines: string[] = []
      let line = ''
      for(const word of words){
        const test = line ? line + ' ' + word : word
        const w = ctx.measureText(test).width
        if(w>maxWidth){
          if(line) lines.push(line)
          line = word
        } else {
          line = test
        }
      }
      if(line) lines.push(line)
      return lines
    }

    return ()=> cancelAnimationFrame(raf)
  }, [selfieDataUrl, scriptText])

  return (
    <div className="card">
      <h3 className="text-2xl md:text-3xl font-semibold mb-2">Generate Talking Video</h3>
      <p className="text-white/70 mb-4">Local quick mode: records a stylized talking portrait from your selfie. Read the on-screen prompter or use your own words. Audio is captured from your mic.</p>
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30">
        <canvas ref={canvasRef} className="w-full h-auto" />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {!recording ? (
          <button className="btn" onClick={startRecording}>Start Recording</button>
        ) : (
          <button className="btn-secondary btn" disabled>Recording...</button>
        )}
        <button className="btn-secondary btn" onClick={()=>setPrompting(p=>!p)}>{prompting? 'Hide Script' : 'Show Script'}</button>
        {blobUrl && <a className="btn" href={blobUrl} download="talking-video.webm">Download Video</a>}
      </div>
      {err && <p className="text-red-400 mt-3">{err}</p>}
      {prompting && (
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 whitespace-pre-wrap text-sm">
          {scriptText}
        </div>
      )}
    </div>
  )
}
