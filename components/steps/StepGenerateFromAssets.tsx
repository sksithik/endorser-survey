'use client'
import { useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import VendorAIGenerator from '@/components/VendorAIGenerator'

type Props = {
  notes: string
  selfie: string
  voiceBlobUrl: string
}

export default function StepGenerateFromAssets({ notes, selfie, voiceBlobUrl }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [videoUrl, setVideoUrl] = useState<string>('')
  const ffmpegRef = useRef(new FFmpeg())

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current
    ffmpeg.on('progress', ({ progress }) => setProgress(Math.round(progress * 100)))
    setMessage('Preparing video engine…')
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    })
  }

  const generateSlideshow = async () => {
    if (!selfie || !voiceBlobUrl) return
    setIsGenerating(true)
    setVideoUrl('')
    setProgress(0)

    const ffmpeg = ffmpegRef.current
    // @ts-ignore
    if (!ffmpeg.loaded) await loadFFmpeg()

    setMessage('Composing video…')
    await ffmpeg.writeFile('selfie.png', await fetchFile(selfie))
    await ffmpeg.writeFile('audio.webm', await fetchFile(voiceBlobUrl))
    await ffmpeg.exec([
      '-loop', '1',
      '-i', 'selfie.png',
      '-i', 'audio.webm',
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      'output.mp4'
    ])
    setMessage('Finalizing…')
    const data = await ffmpeg.readFile('output.mp4')
    const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }))
    setVideoUrl(url)
    setIsGenerating(false)
    setMessage('')
  }

  return (
    <div className="grid gap-6">
      {/* FFmpeg slideshow from selfie + recorded voice */}
      <div className="card bg-gradient-to-br from-blue-500/20 to-purple-500/20">
        <h3 className="text-xl font-semibold mb-3">Export: Slideshow (Selfie + Your Voice)</h3>
        <p className="text-sm text-white/60 mb-4">Renders locally in your browser. Keep this tab open during export.</p>

        {!isGenerating && !videoUrl && (
          <button className="btn w-full" onClick={generateSlideshow} disabled={!selfie || !voiceBlobUrl}>
            Generate MP4
          </button>
        )}

        {isGenerating && (
          <div className="text-center">
            <div className="font-semibold mb-2">{message}</div>
            <div className="w-full bg-white/10 rounded-full h-2.5">
              <div className="bg-blue-500 h-2.5 rounded-full transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-sm mt-2 text-white/70">Rendering…</div>
          </div>
        )}

        {videoUrl && (
          <div className="grid gap-4 mt-4">
            <video src={videoUrl} controls className="w-full rounded-lg" />
            <a href={videoUrl} download="slideshow_selfie_voice.mp4" className="btn-secondary btn w-full text-center">
              Download MP4
            </a>
          </div>
        )}
      </div>

      {/* HeyGen hosted generation (uses selfie + notes) */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Hosted AI (HeyGen)</h3>
        <p className="text-sm text-white/60 mb-4">Generate a talking-head using your selfie and script (notes).</p>
        <VendorAIGenerator selfieDataUrl={selfie} scriptText={notes} />
      </div>
    </div>
  )
}
