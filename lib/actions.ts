// app/actions.ts
'use server'

import { supabase } from '@/lib/supabaseClient'
import { revalidatePath } from 'next/cache'

/**
 * Updates the session to mark consent as given.
 * @param sessionId The unique session identifier.
 * @returns An object indicating success or an error message.
 */
export async function grantConsent(sessionId: string) {
  if (!sessionId) {
    return { error: 'A valid Session ID is required.' }
  }

  try {
    const { error } = await supabase
      .from('endorser_survey_sessions')
      .update({
        consent_given: true,
        consent_given_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)

    if (error) {
      console.error('Supabase consent update error:', error)
      throw new Error('Could not save your consent. Please try again.')
    }

    // Revalidate the path to force Next.js to re-render the page with fresh data.
    // This will make the page switch from the consent form to the welcome content.
    revalidatePath(`/welcome`)
    return { success: true }

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: errorMessage }
  }
}