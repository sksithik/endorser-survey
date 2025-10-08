import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Talking Wizard',
  description: 'Survey → selfie → auto-notes → talking video',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
