// app/welcome/ConsentForm.tsx
'use client'

import { grantConsent } from '@/lib/actions';
import { useState, useTransition } from 'react'// Import the server action

type ConsentFormProps = {
  sessionId: string;
}

export function ConsentForm({ sessionId }: ConsentFormProps) {
  const [isChecked, setIsChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isChecked) return;

    setError(null)

    startTransition(async () => {
      const result = await grantConsent(sessionId)
      if (result.error) {
        setError(result.error)
      }
      // On success, the server action's revalidatePath will trigger a page refresh,
      // showing the main content automatically.
    })
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-xl text-center p-8 rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex justify-center mb-6">
           <div className="flex items-center gap-3">
             <div className="h-7 w-7 rounded-lg sparkle" />
             <span className="font-semibold">AI Talking Wizard</span>
           </div>
         </div>

        <h1 className="text-3xl font-bold mb-4">One Quick Thing...</h1>
        <p className="text-white/70 mb-8">
          To create your personalized video, this experience needs to process your responses. Please provide your consent to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-center gap-3 mb-8 cursor-pointer" onClick={() => setIsChecked(!isChecked)}>
            <input
              id="consent-checkbox"
              name="consent"
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 bg-transparent text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="consent-checkbox" className="text-sm font-medium text-white cursor-pointer select-none">
              I understand and agree to participate.
            </label>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">Error: {error}</p>}

          <button
            type="submit"
            disabled={!isChecked || isPending}
            className="btn btn-lg w-full"
          >
            {isPending ? 'Saving...' : "Let's Get Started"}
          </button>
        </form>
      </div>

      <footer className="absolute bottom-0 text-center text-white/50 text-xs p-8">
        AI Talking Wizard © 2025
      </footer>
    </main>
  )
}