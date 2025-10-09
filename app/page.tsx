// Filename: app/page.tsx

import { redirect } from 'next/navigation'

export default function RootPage() {
  // This will permanently redirect any user visiting the root '/'
  // to the '/welcome' page.
  redirect('/welcome')

  // Note: Since this component just redirects, it doesn't need to
  // return any JSX.
}