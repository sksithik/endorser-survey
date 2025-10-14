'use client'
import { useMemo } from 'react'

const creationModes = [
  {
    id: 'teleprompter_video',
    title: 'Real Camera',
    description: 'Record yourself with a built-in teleprompter for a polished delivery.',
    videoUrl: 'https://storage.googleapis.com/gemini-dev-public/demo-clips/teleprompter_demo.mp4',
  },
  {
    id: 'avatar',
    title: 'AI Avatar',
    description: 'Generate a video with a talking AI avatar from your script.',
    videoUrl: 'https://storage.googleapis.com/gemini-dev-public/demo-clips/avatar_demo.mp4',
  },
  {
    id: 'slideshow',
    title: 'Narrated Slideshow',
    description: 'Create a simple video by recording your voice over the script.',
    videoUrl: 'https://storage.googleapis.com/gemini-dev-public/demo-clips/slideshow_demo.mp4',
  },
];

type Mode = 'teleprompter_video' | 'avatar' | 'slideshow' | null;

type Props = {
  notes: string
  setNotes: (v: string) => void
  mode: Mode
  setMode: (m: Exclude<Mode, null>) => void
  /** Optional: override loading/error UI from parent */
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function StepModeAndNotes({
  notes,
  setNotes,
  mode,
  setMode,
  isLoading,
  error,
  onRetry
}: Props) {
  // If parent doesn't pass isLoading, infer from empty notes (first render)
  const loading = useMemo(() => {
    if (typeof isLoading === 'boolean') return isLoading
    return !notes && !error // default inferred loading
  }, [isLoading, notes, error])

  return (
    <div className="grid gap-6">
      {/* Script Card */}
      <div className="card relative overflow-hidden">
        <h3 className="text-xl font-semibold mb-3">Your Script</h3>
        <p className="text-sm text-white/60 mb-3">
          Edit your auto-generated talking points. Keep it ~20–30 seconds for best results.
        </p>

        {/* Loading state (skeleton shimmer) */}
        {loading && (
          <div className="relative">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-1/2 bg-white/10 rounded" />
              <div className="h-4 w-5/6 bg-white/10 rounded" />
              <div className="h-4 w-4/5 bg-white/10 rounded" />
              <div className="h-4 w-3/4 bg-white/10 rounded" />
              <div className="h-4 w-2/3 bg-white/10 rounded" />
              <div className="h-4 w-1/3 bg-white/10 rounded" />
            </div>

            {/* Subtle gradient sweep */}
            <div
              className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
              style={{ maskImage: 'linear-gradient(90deg, transparent, black 40%, black 60%, transparent)' }}
            />

            {/* Info row */}
            <div className="mt-4 flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-white/70">Generating your script… this runs on-device and completes quickly.</span>
            </div>

            <style jsx>{`
              @keyframes shimmer {
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        )}

        {/* Error state */}
        {!loading && !!error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm">
            <div className="font-medium text-red-300 mb-1">Couldn’t generate your script</div>
            <div className="text-red-200/90 mb-3">{error}</div>
            <div className="flex gap-3">
              {onRetry && (
                <button onClick={onRetry} className="btn">Try Again</button>
              )}
              <button
                onClick={() => setNotes('')}
                className="btn-secondary btn"
                title="Clear editor"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        {!loading && !error && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            className="w-full text-sm bg-white/5 p-4 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Introduce yourself, share the key benefit in one sentence, add a quick example, and end with a friendly call-to-action."
          />
        )}
      </div>

      {/* Mode Picker */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-3">Choose Your Creation Mode</h3>
        <p className="text-sm text-white/60 mb-4">Select how you want to generate your video. Click a card to see a preview.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creationModes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id as Exclude<Mode, null>)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                mode === m.id
                  ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-500/10'
                  : 'border-white/10 hover:border-white/30 bg-white/5'
              } text-left flex flex-col`}
            >
              <div className="flex-grow">
                <div className="font-semibold text-lg mb-1">{m.title}</div>
                <p className="text-sm text-white/70 mb-3">{m.description}</p>
              </div>
              <div className="aspect-video rounded-md overflow-hidden border border-white/10 mt-2">
                <video
                  src={m.videoUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            </button>
          ))}
        </div>

        {/* Small helper */}
        <p className="text-xs text-white/50 mt-4 text-center">
          Tip: For best results with AI avatars, keep your script conversational and under 30 seconds.
        </p>
      </div>
    </div>
  )
}
