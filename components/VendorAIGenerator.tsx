'use client'
import { useState } from 'react'

// Placeholder for third-party avatar vendors (D-ID, HeyGen, etc.).
// Provide a POST target URL and API key via env or form.
// NOTE: For security, call your own Next.js route handler (server) to forward requests.

export default function VendorAIGenerator(){
  const [status, setStatus] = useState<string>('Idle')

  const start = async ()=>{
    setStatus('Sending to vendor...')
    try{
      const res = await fetch('/api/vendor-demo', { method: 'POST' })
      if(!res.ok) throw new Error('Bad response')
      const data = await res.json()
      setStatus(data.message || 'Requested. Check your vendor dashboard.')
    }catch(e: any){
      setStatus('Error: ' + e.message)
    }
  }

  return (
    <div className="card">
      <h3 className="text-2xl md:text-3xl font-semibold mb-2">AI Model (Vendor) Mode</h3>
      <p className="text-white/70 mb-4">
        Use a hosted talking-head service for higher realism. Set credentials in a server route, keep secrets off the client, and handle webhooks for completion.
      </p>
      <button className="btn" onClick={start}>Trigger Vendor (demo)</button>
      <div className="mt-3 text-white/70 text-sm">{status}</div>
    </div>
  )
}
