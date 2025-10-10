'use client'
type Props = {
  notes: string
  setNotes: (v: string) => void
  mode: 'selfie_voice' | 'teleprompter_video' | null
  setMode: (m: 'selfie_voice' | 'teleprompter_video') => void
}

export default function StepModeAndNotes({ notes, setNotes, mode, setMode }: Props) {
  return (
    <div className="grid gap-6">
      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Your Script</h3>
        <p className="text-sm text-white/60 mb-3">Edit your auto-generated talking points.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          className="w-full text-sm bg-white/5 p-4 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Keep it to ~20–30 seconds for best results."
        />
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Choose How You Want to Create</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMode('selfie_voice')}
            className={`p-4 rounded-xl border ${mode==='selfie_voice' ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-white/10'} bg-white/5 text-left`}
          >
            <div className="text-lg font-semibold mb-1">Selfie + Voice</div>
            <p className="text-sm text-white/70">
              Capture a selfie and record your voice. Next step lets you export a slideshow MP4 or generate a HeyGen talking-head.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('teleprompter_video')}
            className={`p-4 rounded-xl border ${mode==='teleprompter_video' ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-white/10'} bg-white/5 text-left`}
          >
            <div className="text-lg font-semibold mb-1">Teleprompter Video</div>
            <p className="text-sm text-white/70">
              Record yourself on camera with a built-in teleprompter and a 3-2-1 countdown.
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}
