'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export default function SelfieCapture({ onCapture }:{ onCapture: (dataUrl: string)=>void }){
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [snap, setSnap] = useState<string|null>(null)

  useEffect(()=>{
    (async ()=>{
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if(videoRef.current){
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setReady(true)
        }
      }catch(e){
        console.error(e)
      }
    })()
    return ()=>{
      if(videoRef.current?.srcObject){
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(t=>t.stop())
      }
    }
  }, [])

  const takePhoto = ()=>{
    if(!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')!
    ctx.drawImage(v, 0, 0, c.width, c.height)
    const data = c.toDataURL('image/png')
    setSnap(data)
    onCapture(data)
  }

  return (
    <div className="card">
      <h3 className="text-2xl md:text-3xl font-semibold mb-4">Take a quick selfie</h3>
      <div className="relative rounded-2xl overflow-hidden border border-white/10">
        {!snap ? (
          <video ref={videoRef} className="w-full aspect-[3/4] object-cover bg-black/50" playsInline muted />
        ) : (
          <img src={snap} alt="Selfie" className="w-full aspect-[3/4] object-cover" />
        )}
      </div>
      <div className="mt-4 flex gap-3">
        {!snap ? (
          <button disabled={!ready} onClick={takePhoto} className="btn">{ready ? 'Capture' : 'Loading camera...'}</button>
        ) : (
          <>
            <button onClick={()=>setSnap(null)} className="btn-secondary btn">Retake</button>
            <a href={snap} download="selfie.png" className="btn">Download Selfie</a>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
