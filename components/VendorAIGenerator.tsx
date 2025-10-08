'use client'
import { useEffect, useRef, useState } from 'react'

// Placeholder for third-party avatar vendors (D-ID, HeyGen, etc.).
// Provide a POST target URL and API key via env or form.
// NOTE: For security, call your own Next.js route handler (server) to forward requests.

type Props = {
  selfieDataUrl: string
  scriptText: string
}

export default function VendorAIGenerator({ selfieDataUrl, scriptText }: Props){
  const [status, setStatus] = useState<string>('Idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const pollRef = useRef<any>(null)
  const [provider, setProvider] = useState<'heygen' | 'did'>('heygen')

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const start = async ()=>{
    setVideoUrl(null)
    setStatus('Creating with vendor...')
    try{
      const route = provider === 'heygen' ? '/api/talking-video-heygen' : '/api/talking-video'
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selfieDataUrl, script: scriptText })
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data?.error || 'Create failed')
      const id = data.id
      if(!id) throw new Error('No job id returned')
      setStatus('Queued. Polling for completion...')

      pollRef.current = setInterval(async () => {
        try{
          const proute = provider === 'heygen' ? '/api/talking-video-heygen' : '/api/talking-video'
          const r = await fetch(`${proute}?id=${encodeURIComponent(id)}`)
          const d = await r.json()
          if(!r.ok) throw new Error(d?.error || 'Poll failed')
          if(d.status === 'done' && d.url){
            clearInterval(pollRef.current)
            setVideoUrl(d.url)
            setStatus('Completed')
          } else if(d.status === 'error'){
            clearInterval(pollRef.current)
            setStatus('Error from vendor')
          } else {
            setStatus(`Status: ${d.status || 'processing'}`)
          }
        } catch (e: any) {
          clearInterval(pollRef.current)
          setStatus('Polling error: ' + (e?.message || 'Unknown'))
        }
      }, 2500)
    }catch(e: any){
      setStatus('Error: ' + (e?.message || 'Unknown'))
    }
  }

  return (
    <div className="card">
      <h3 className="text-2xl md:text-3xl font-semibold mb-2">AI Model (Vendor) Mode</h3>
      <p className="text-white/70 mb-4">
        Uses a hosted talking‑head model for higher realism. Runs through a server route to keep API keys safe.
      </p>
      <div className="mb-3 flex gap-3 items-center text-sm">
        <label className="text-white/70">Provider:</label>
        <select className="bg-white/5 border border-white/10 rounded-md px-2 py-1" value={provider} onChange={e=>setProvider(e.target.value as any)}>
          <option value="heygen">HeyGen</option>
          <option value="did">D-ID</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <button className="btn" onClick={start}>Create Talking Video</button>
        <span className="text-white/70 text-sm">{status}</span>
      </div>
      {videoUrl && (
        <div className="mt-4">
          <video className="rounded-xl border border-white/10 w-full max-w-xl" src={videoUrl} controls />
          <div className="mt-2 flex gap-3">
            <a className="btn" href={videoUrl} download>Download</a>
            <a className="btn-secondary btn" href={videoUrl} target="_blank" rel="noreferrer">Open</a>
          </div>
        </div>
      )}
    </div>
  )
}
