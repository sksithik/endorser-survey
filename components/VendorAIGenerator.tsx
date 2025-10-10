'use client'
import { useEffect, useRef, useState } from 'react'

// A simple SVG spinner component for loading states
const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

type Props = {
  selfieDataUrl: string
  scriptText: string
}

export default function VendorAIGenerator({ selfieDataUrl, scriptText }: Props) {
  const [status, setStatus] = useState<string>('Ready')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const pollRef = useRef<any>(null)

  // Clean up the polling interval when the component unmounts
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const startGeneration = async () => {
    // Reset state for a new generation
    if (isProcessing) return;
    setVideoUrl(null)
    setIsProcessing(true)
    setStatus('Submitting job...')

    try {
      // The component is now dedicated to the HeyGen API route
      const route = '/api/talking-video-heygen'
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selfieDataUrl, script: scriptText })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to start generation.')
      
      const jobId = data.id
      if (!jobId) throw new Error('No job ID returned from the server.')
      
      setStatus('Job queued. Awaiting processing...')

      // Start polling for the result
      pollRef.current = setInterval(async () => {
        try {
          const pollResponse = await fetch(`${route}?id=${encodeURIComponent(jobId)}`)
          const pollData = await pollResponse.json()

          if (!pollResponse.ok) throw new Error(pollData?.error || 'Polling request failed.')
          
          if (pollData.status === 'done' && pollData.url) {
            clearInterval(pollRef.current)
            setVideoUrl(pollData.url)
            setStatus('Generation Complete')
            setIsProcessing(false)
          } else if (pollData.status === 'error') {
            clearInterval(pollRef.current)
            setStatus(`Error: ${pollData.error || 'Vendor failed to process video.'}`)
            setIsProcessing(false)
          } else {
            // Provide a more user-friendly status update
            const friendlyStatus = pollData.status ? pollData.status.replace('_', ' ') : 'processing...'
            setStatus(`Status: ${friendlyStatus}`)
          }
        } catch (pollError: any) {
          clearInterval(pollRef.current)
          setStatus('Error: ' + (pollError?.message || 'Could not fetch status.'))
          setIsProcessing(false)
        }
      }, 3000) // Poll every 3 seconds

    } catch (e: any) {
      setStatus('Error: ' + (e?.message || 'An unknown error occurred.'))
      setIsProcessing(false)
    }
  }

  return (
    <div className="card">
      <h3 className="text-xl font-semibold mb-2">Option C: Generate a Realistic AI Video</h3>
      <p className="text-white/70 mb-4">
        Use a professional-grade AI model for realistic lip-syncing. This process requires a configured API key and may take several minutes to complete.
      </p>
      
      <div className="flex flex-wrap gap-4 items-center">
        <button 
          className="btn" 
          onClick={startGeneration} 
          disabled={isProcessing || !selfieDataUrl || !scriptText}
        >
          Generate with AI
        </button>
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Spinner />
            <span>{status}</span>
          </div>
        )}
      </div>

      {!isProcessing && status.startsWith('Error') && (
        <p className="mt-3 text-sm text-red-400">{status}</p>
      )}

      {videoUrl && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-3">Your video is ready:</h4>
          <video 
            className="rounded-xl border border-white/10 w-full max-w-xl bg-black" 
            src={videoUrl} 
            controls 
            playsInline 
            autoPlay
          />
          <div className="mt-3 flex gap-3">
            <a className="btn" href={videoUrl} download="ai_generated_video.mp4">Download Video</a>
            <a className="btn-secondary btn" href={videoUrl} target="_blank" rel="noreferrer">Open in New Tab</a>
          </div>
        </div>
      )}
    </div>
  )
}