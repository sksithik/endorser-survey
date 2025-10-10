'use client'
import { useMemo } from 'react'

type Mode = 'selfie_voice' | 'teleprompter_video' | null

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
        <h3 className="text-xl font-semibold mb-3">Choose How You Want to Create</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMode('selfie_voice')}
            className={`p-4 rounded-xl border transition ring-offset-2 ${
              mode === 'selfie_voice'
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'border-white/10 hover:border-white/20'
            } bg-white/5 text-left`}
          >
            <div className="text-lg font-semibold mb-1">Selfie + Voice</div>
            <ul className="text-sm text-white/70 space-y-1 list-disc pl-5">
              <li>Capture a selfie</li>
              <li>Record your voice reading the script</li>
              <li>Next: export slideshow MP4 or generate HeyGen</li>
            </ul>
          </button>

          <button
            type="button"
            onClick={() => setMode('teleprompter_video')}
            className={`p-4 rounded-xl border transition ring-offset-2 ${
              mode === 'teleprompter_video'
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'border-white/10 hover:border-white/20'
            } bg-white/5 text-left`}
          >
            <div className="text-lg font-semibold mb-1">Teleprompter Video</div>
            <ul className="text-sm text-white/70 space-y-1 list-disc pl-5">
              <li>Built-in teleprompter</li>
              <li>3-2-1 countdown</li>
              <li>Preview & download your recording</li>
            </ul>
          </button>
        </div>

        {/* Small helper */}
        <p className="text-xs text-white/50 mt-3">
          Tip: If you plan to use HeyGen, keep sentences short and conversational for better lip-sync.
        </p>
      </div>
    </div>
  )
}
